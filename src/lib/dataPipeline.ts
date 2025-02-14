import { AuthService } from '@/lib/auth.service';
import { luxon } from '@/lib/localeDate';
import { Payout } from '@/lib/types';
import { escapeTelegramEntities, fnCapitalize, formatNumber } from '@/lib/utils';

interface createMsgInterface {
    label: string;
    value: string | number;
    type: number | string | 'date';
    currency?: string;
}

export interface GetAlphaTransactionsPayloadInterface {
    state: 'confirming' | 'failed' | string;
    limit?: number;
    ordering?: 'asc' | 'desc';
    from?: string;
    to?: string;
}

const createTextMsg = (payload: createMsgInterface[]) => {
    return payload.map(({ label, value, type, currency }) =>
        `${label}: ${(type === 'number' ? formatNumber(value) : value)} ${currency ? `${currency.toUpperCase()}` : ''}`
    ).join('\n');
};

export class DataPipeline {
    static async getAlphaBalance() {
        const { data } = await AuthService.get('/admin/exchange_balances');

        if (!data?.length) return { data: ['No data found'], options: {} };

        const xettleBlc = data.filter(({ id, currency }) => id === 'xettle' && currency === 'inr');
        const { balance = 0, locked = 0 } = xettleBlc?.[0] || {};

        return {
            data: [`*🏛️ AlphaGateway*\n\nTotal Balance:\n*${escapeTelegramEntities(formatNumber(+balance + +locked, {
                style: 'currency',
                currency: 'INR',
            }))}*\n`],
            options: {},
        };
    }

    static async getAlphaTransactions(payload: GetAlphaTransactionsPayloadInterface) {
        const { data = [] } = await AuthService.get('/admin/payout_requests', {
            from: payload.from,
            limit: payload.limit || 100,
            ordering: payload.ordering || 'asc',
            state: [payload.state],
            to: payload.to,
            type: 'fiat',
        }) as { data: Payout[]; headers: { total: string } };

        let totalAmount = 0;

        const formattedData = data
            .filter((i) => i.gateway_reference_name === 'AlphaGateway')
            .map(({ tid, amount = 0, currency_id, remote_id, state: status, created_at }) => {
                totalAmount += +amount;

                return createTextMsg([
                    { label: 'Order Id', value: '`' + tid + '`', type: 'string' },
                    { label: 'Remote Id', value: '`' + remote_id + '`', type: 'string' },
                    {
                        label: 'Amount',
                        value: escapeTelegramEntities(formatNumber(amount, {
                            style: 'currency',
                            currency: currency_id,
                        })),
                        type: 'text',
                    },
                    { label: 'Status', value: status, type: 'text' },
                    {
                        label: 'Created At',
                        value: luxon.fromISO(created_at).toRelative(),
                        type: 'date',
                    },
                ]);
            });

        return {
            data: [
                `*🏛️ AlphaGateway*\n\n${fnCapitalize(payload.state)} Orders: *${formatNumber(+data.length)}*\nOrder Amount: *${escapeTelegramEntities(formatNumber(totalAmount, {
                    style: 'currency',
                    currency: 'INR',
                }))}*\n`,
            ].concat(formattedData),
            options: {},
        };
    }
}
