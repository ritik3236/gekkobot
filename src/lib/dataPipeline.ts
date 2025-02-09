import { AuthService } from '@/lib/auth.service';
import { localeDate } from '@/lib/localeDate';
import { Payouts, Withdrawal } from '@/lib/types';
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

const formatWithdrawal = (payload: Withdrawal[]) => {
    return payload.map((v) => ([
        { label: 'ID', value: v.id, type: 'string' },
        { label: 'Client Ref ID', value: v.client_reference_id, type: 'string' },
        { label: 'Email', value: v.email, type: 'string' },
        { label: 'Amount', value: v.amount, type: 'number', currency: v.currency },
        { label: 'Status', value: v.state, type: 'string' },
        { label: 'Remark', value: v.remark, type: 'string' },
        { label: 'Created At', value: localeDate(v.created_at), type: 'string' },
    ]));
};

const formatPayouts = (payload: Payouts[]) => {
    return payload.map((v) => ([
        { label: 'ID', value: v.id, type: 'string' },
        { label: 'Remote ID', value: v.remote_id, type: 'string' },
        { label: 'Withdraw ID', value: v.withdraw_reference_id, type: 'string' },
        { label: 'Email', value: v.email, type: 'string' },
        { label: 'Retry Attempt', value: v.retry_attempt, type: 'number' },
        { label: 'Status', value: v.state, type: 'string' },
        { label: 'Remark', value: v.remark, type: 'string' },
        { label: 'Created At', value: localeDate(v.created_at), type: 'string' },
    ]));
};

export class DataPipeline {
    static async getPayoutPartnersBalance() {
        const data = await AuthService.get('/admin/exchange_balances') as any[];

        if (!data?.length) return '❌ No data found';

        const inrBlc = data.filter(({ currency }) => currency === 'inr');

        const payload = inrBlc.map(({ id, balance, currency, locked }) => ([
            { label: 'ID', value: id, type: 'string' },
            { label: 'Balance', value: balance, type: 'number', currency },
            { label: 'Locked', value: locked, type: 'number', currency },
        ]));

        return `Payout Partners Balance:\n\n${payload.map((data) => createTextMsg(data)).join('\n\n')}`;
    }

    static async getPayoutPartnerXBalance() {
        const data = await AuthService.get('/admin/exchange_balances') as any[];

        if (!data?.length) return '❌ No data found';

        const xettleBlc = data.filter(({ id }) => id === 'xettle');

        const payload = xettleBlc.map(({ balance, currency, locked }) => ([
            { label: 'Total Balance: ', value: +balance + +locked, type: 'number', currency },
        ]));

        return `PartnerX Balance:\n\n${payload.map((data) => createTextMsg(data)).join('\n\n')}`;
    }

    static async getLastWithdrawals() {
        const data = await AuthService.get('/admin/withdraws', { limit: 10 }) as Withdrawal[];

        if (!data?.length) return '❌ No withdrawals found';

        return `Last 5 Withdrawals:\n\n${formatWithdrawal(data).map((data) => createTextMsg(data)).join('\n\n')}`;
    }

    static async getWithdrawById(id: string) {
        const data = await AuthService.get('/admin/withdraws', { client_reference_id: id, limit: 10 }) as any[];

        if (!data?.length) return `❌ No withdrawal found for ID: ${id}`;

        return `Withdraw details for ID ${id}:\n\n${createTextMsg(formatWithdrawal(data).flat())}`;
    }

    static async getLastPayouts() {
        const data = await AuthService.get('/admin/payout_requests', { limit: 10 }) as Payouts[];

        if (!data?.length) return '❌ No payouts found';

        return `Last 5 Payouts:\n\n${formatPayouts(data).map((data) => createTextMsg(data)).join('\n\n')}`;
    }

    static async getPayoutById(id: string) {
        const data = await AuthService.get('/admin/payout_requests', { withdraw_id: id, limit: 10 }) as any[];

        if (!data?.length) return `❌ No payout found for ID: ${id}`;

        return `Payout details for ID ${id}:\n\n${createTextMsg(formatPayouts(data)[0])}`;
    }
}
