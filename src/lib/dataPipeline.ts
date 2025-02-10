import { AuthService } from '@/lib/auth.service';
import { getTimezone, luxon } from '@/lib/localeDate';
import { Payout } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

interface createMsgInterface {
    label: string;
    value: string | number;
    type: number | string | 'date';
    currency?: string;
}

const createTextMsg = (payload: createMsgInterface[]) => {
    return payload.map(({ label, value, type, currency }) =>
        `${label}: ${(type === 'number' ? formatNumber(value) : value)} ${currency ? `${currency.toUpperCase()}` : ''}`
    ).join('\n');
};

export class DataPipeline {
    static async getPayoutPartnerAlphaBalance() {
        const { data } = await AuthService.get('/admin/exchange_balances');

        if (!data?.length) return { data: ['No data found'], options: {} };

        const xettleBlc = data.filter(({ id, currency }) => id === 'xettle' && currency === 'inr');
        const { balance = 0, locked = 0 } = xettleBlc?.[0] || {};

        return {
            data: [`🏛️ AlphaGateway\n\nTotal Balance:\n*${formatNumber(+balance + +locked, {
                style: 'currency',
                currency: 'INR',
            })}*\n`],
            options: {},
        };
    }

    static async getPayoutPartnerAlphaTransactions() {
        const { data = [] } = await AuthService.get('/admin/payout_requests', {
            limit: 100,
            ordering: 'asc',
            state: ['confirming'],
            type: 'fiat',
        }) as { data: Payout[]; headers: { total: string } };

        let totalAmount = 0;

        const payload = data
            .filter((i) => i.gateway_reference_name = 'AlphaGateway')
            .map(({ tid, amount = 0, currency_id, remote_id, created_at }) => {
                totalAmount += +amount;

                return createTextMsg([
                    { label: 'Order Id', value: '`' + tid + '`', type: 'string' },
                    { label: 'Remote Id', value: '`' + remote_id + '`', type: 'string' },
                    {
                        label: 'Amount',
                        value: formatNumber(amount, { style: 'currency', currency: currency_id }),
                        type: 'text',
                    },
                    {
                        label: 'Created At',
                        value: luxon.fromISO(created_at, { zone: getTimezone() }).toRelative(),
                        type: 'date',
                    },
                ]);
            });

        return {
            data: [
                `*🏛️ AlphaGateway*\n\nProcessing Orders: *${formatNumber(+data.length)}*\nOrder Amount: *${formatNumber(totalAmount, {
                    style: 'currency',
                    currency: 'INR',
                })}*\n`,
            ].concat(payload),
            options: {},
        };
    }
}
