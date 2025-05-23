import { NextResponse } from 'next/server';

import { splitMessageAtDelimiter } from '@/bots/xbot';
import { AuthService } from '@/lib/auth.service';
import { buildOtcUpdateMsg } from '@/lib/messageBulider';
import { OTC_CHAT_ID, OtcPriceUpdateBot } from '@/lib/telegram/otc-update';
import { escapeTelegramEntities } from '@/lib/utils';

// Configuration
const config = {
    isOn: false,
    delayBetweenDeals: 200,
    exchangeRateApiKey: '914956ed84bf4478960f785d81e77046',
    margins: { buy: 0, sell: 0.8 },
    minPriceChangeThreshold: 0.001,
    whitelistedDealIds: new Set([]),
    whitelistedUids: new Set([]),

    supportedMarkets: {
        'usdtinr': { quoteCurrency: 'INR', precision: 2 },
        'usdtaed': { quoteCurrency: 'AED', precision: 2 },
    },
};

interface Deal {
    id: number;
    uid: string;
    market: string;
    side: 'buy' | 'sell';
    price: number;
    amount: number;
    min_amount: number;
    metadata?: any;
}

export interface UpdateResult {
    dealId: number;
    newDeal?: Deal;
    oldDeal?: Deal;
    newDealId?: number;
    oldPrice?: number;
    newPrice?: number;
    action: string;
    status?: string;
    reason?: string;
    market?: string;
}

export async function GET(_req: Request): Promise<NextResponse> {
    if (!config.isOn) {
        return NextResponse.json({ status: 'not_ok', error: 'API is disabled' }, { status: 200 });
    }

    try {
        console.log('OTC deal price update process started...');

        // Step 1: Fetch all active OTC deals
        const activeDealsRes = await AuthService.get('/admin/otc_deals', { state: ['active'], side: 'sell' });

        if (activeDealsRes.error) {
            return NextResponse.json({ status: 'not_ok', error: activeDealsRes.error }, { status: 500 });
        }

        // Step 2: Get current exchange rates
        const exchangeRatesRes = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${config.exchangeRateApiKey}`);
        const exchangeData = await exchangeRatesRes.json();

        if (!exchangeData.rates) {
            return NextResponse.json({ status: 'not_ok', error: 'Failed to get exchange rates' }, { status: 500 });
        }

        const activeDeals: Deal[] = activeDealsRes.data;
        const results: UpdateResult[] = [];
        const exchangeRatesUsed: Record<string, number> = {};

        // Step 3: Process each deal sequentially
        for (const deal of activeDeals) {
            if (config.delayBetweenDeals > 0 && results.length > 0) {
                await new Promise((resolve) => setTimeout(resolve, config.delayBetweenDeals));
            }

            // Skip whitelisted deals/users
            if (config.whitelistedDealIds.has(deal.id)) {
                results.push({ dealId: deal.id, action: 'skipped', reason: 'whitelisted deal' });
                continue;
            }
            if (config.whitelistedUids.has(deal.uid)) {
                results.push({ dealId: deal.id, action: 'skipped', reason: 'whitelisted user' });
                continue;
            }
            if (deal.side === 'buy') {
                results.push({ dealId: deal.id, action: 'skipped', reason: 'buy deal' });
                continue;
            }

            const activeOrders = await AuthService.get('/admin/otc_orders', { otc_deal: deal.id, state: ['pending'] });

            if (activeOrders.data.length > 0) {
                results.push({ dealId: deal.id, action: 'skipped', reason: 'deal has active orders' });
                continue;
            }

            // Check if market is supported
            const marketConfig = config.supportedMarkets[deal.market];

            if (!marketConfig) {
                results.push({
                    dealId: deal.id,
                    market: deal.market,
                    action: 'skipped',
                    reason: 'unsupported market',
                });
                continue;
            }

            // Get exchange rate for this market
            const quoteCurrency = marketConfig.quoteCurrency;
            const exchangeUsdRate = exchangeData.rates[quoteCurrency];

            if (!exchangeUsdRate) {
                results.push({
                    dealId: deal.id,
                    market: deal.market,
                    action: 'skipped',
                    reason: 'exchange rate not available',
                });
                continue;
            }

            // Store the rate we're using for the response
            exchangeRatesUsed[`USD_${quoteCurrency}`] = exchangeUsdRate;

            // Calculate new price with market-specific precision
            const newMarketPrice = calculateNewPrice(deal.side, exchangeUsdRate, marketConfig.precision);

            // Skip insignificant changes
            if (Math.abs((newMarketPrice - deal.price) / deal.price) < config.minPriceChangeThreshold) {
                results.push({
                    dealId: deal.id,
                    oldPrice: deal.price,
                    newPrice: newMarketPrice,
                    action: 'skipped',
                    reason: 'insignificant price change',
                });
                continue;
            }

            try {
                // Create new deal
                const createRes = await AuthService.post('/admin/otc_deals', {
                    ...deal,
                    price: newMarketPrice,
                });

                if (createRes.error) throw new Error(createRes.error);

                // Accept the new deal
                const acceptRes = await AuthService.patch(
                    `/admin/otc_deals/${createRes.data?.id}/action`,
                    {
                        action: 'accept',
                        comment: `BOT: Auto-accepted due to Price update from ${deal.price} to ${newMarketPrice}. Old deal #${deal.id}`,
                    }
                );

                if (acceptRes.error) throw new Error(`Accept failed: ${acceptRes.error}`);

                // Cancel old deal
                const cancelRes = await AuthService.patch(
                    `/admin/otc_deals/${deal.id}/action`,
                    {
                        action: 'cancel',
                        comment: `BOT: Auto-canceled. Due to Price update from ${deal.price} to ${newMarketPrice}. New deal #${createRes.data?.id}`,
                    }
                );

                // If cancel fails, reject the new deal
                if (cancelRes.error) {
                    await AuthService.patch(`/admin/otc_deals/${createRes.data?.id}/action`, {
                        action: 'reject',
                        comment: `BOT: Rejected due to failed cancellation of old deal #${deal.id}`,
                    });

                    throw new Error(`Cancel failed: ${cancelRes.error}`);
                }

                results.push({
                    action: 'updated',
                    dealId: deal.id,
                    reason: 'Price updated successfully',
                    newDealId: acceptRes.data?.id,
                    newPrice: newMarketPrice,
                    oldPrice: deal.price,
                    status: 'success',

                    oldDeal: deal,
                    newDeal: acceptRes.data,
                });

            } catch (error) {
                results.push({
                    action: 'failed',
                    dealId: deal.id,
                    reason: error.message,
                    status: 'error',

                    oldDeal: deal,
                });
            }
        }

        const msg = results
            .map((txn: UpdateResult) => buildOtcUpdateMsg(txn))
            .join('\n' + escapeTelegramEntities('----') + '\n');

        const chunks = splitMessageAtDelimiter(msg);
        const promises = chunks.map(async (chunk) => {
            await OtcPriceUpdateBot.bot.api.sendMessage(OTC_CHAT_ID, chunk, {
                ...(chunks.length === 1 && {
                    parse_mode: 'MarkdownV2',
                }),
            });
        });

        await OtcPriceUpdateBot.bot.api.sendMessage(OTC_CHAT_ID, '```' + 'Exchange rates used' + JSON.stringify(exchangeRatesUsed, null, 2) + '```', {
            parse_mode: 'MarkdownV2',
        });

        await Promise.all(promises);

        return NextResponse.json({
            exchangeRates: exchangeRatesUsed,
            marginConfig: config.margins,
            results: results,
            status: 'ok',
        });

    } catch (error) {
        console.error('OTC deal update error:', error);

        return NextResponse.json({ status: 'not_ok', error: error.message }, { status: 500 });
    }
}

function calculateNewPrice(side: string, usdRate: number, precision: number): number {
    const margin = config.margins[side];
    const calculatedPrice = usdRate + margin;

    return parseFloat(calculatedPrice.toFixed(precision));
}
