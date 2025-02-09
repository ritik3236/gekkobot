import { AuthService } from '@/lib/auth.service';
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
    static async getPayoutPartnerXBalance() {
        console.log(new Date().toISOString(), 'balance pipeline');
        const data = await AuthService.get('/admin/exchange_balances') as any[];

        console.log(new Date().toISOString(), 'balance pipeline data');
        if (!data?.length) return '❌ No data found';

        const xettleBlc = data.filter(({ id }) => id === 'xettle');

        const payload = xettleBlc.map(({ balance, currency, locked }) => ([
            { label: 'Total Balance: ', value: +balance + +locked, type: 'number', currency },
        ]));

        return `PartnerX Balance:\n\n${payload.map((data) => createTextMsg(data)).join('\n\n')}`;
    }
}
