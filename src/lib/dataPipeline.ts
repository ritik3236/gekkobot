import { AuthService } from '@/lib/auth.service';
import { maskEmail } from '@/lib/emailMasker';
import { getTimezone, luxon } from '@/lib/localeDate';
import { Withdrawal } from '@/lib/types';
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

        if (!data?.length) return '❌ No data found';

        const xettleBlc = data.filter(({ id }) => id === 'xettle');

        const payload = xettleBlc.map(({ balance, currency, locked }) => ([
            { label: 'Total Balance: ', value: +balance + +locked, type: 'number', currency },
        ]));

        return `AlphaGateway Balance:\n\n${payload.map((data) => createTextMsg(data)).join('\n\n')}`;
    }

    static async getPayoutPartnerAlphaTransactions() {
        const { data = [], headers } = await AuthService.get('/admin/withdraws', {
            state: ['processing'],
            type: 'fiat',
            limit: 50,
        }) as { data: Withdrawal[]; headers: { total: string } };

        const total = headers.total;

        const payload = data
            .filter((i) => i.payment_gateway_name = 'AlphaGateway')
            .map(({ tid, amount, currency, created_at, email }) => ([
                { label: 'TID', value: tid, type: 'string' },
                { label: 'Amount', value: +amount, type: 'number', currency },
                { label: 'Created At', value: luxon.fromISO(created_at, { zone: getTimezone() }).toRelative(), type: 'date' },
                { label: 'Email', value: maskEmail(email), type: 'string' },
            ]));

        return `AlphaGateway Transactions:\n\nTotal Pending Txn: ${total}\n -----------\n\n${payload.map((data) => createTextMsg(data)).join('\n--- --- --- ---\n\n')}`;
    }
}
