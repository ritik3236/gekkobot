import { AuthService } from '@/lib/auth.service';
import { luxon } from '@/lib/localeDate';
import { PartnerBalance, Payout } from '@/lib/types';
import { escapeTelegramEntities, fnCapitalize, formatNumber } from '@/lib/utils';

interface createMsgInterface {
    label: string;
    value: string | number;
    type: number | string | 'date';
    currency?: string;
}

export interface PayoutPayloadInterface {
    state: 'confirming' | 'failed' | string;
    limit?: number;
    ordering?: 'asc' | 'desc';
    from?: string;
    to?: string;
    partner?: string;
}

const createTextMsg = (payload: createMsgInterface[]) => {
    return payload.map(({ label, value, type, currency }) =>
        `${label}: ${(type === 'number' ? formatNumber(value) : value)} ${currency ? `${currency.toUpperCase()}` : ''}`
    ).join('\n');
};

const PAYOUT_PARTNERS = {
    'SSP_MID1': '\\#1 SSPMID1',
    'TechGateway': '\\#2 TechGateway',
    'Xettel': '\\#3 Xettle',
    's2_pay': '\\#1 SSPMID1',
};

export class PayoutService {
    // Fetch all payout partners balance
    static async fetchBalances() {
        const { data = [] } = await AuthService.get('/admin/exchange_balances');

        return data;
    }

    // Filter balances for valid payout partners
    static filterPartnerBalances(balances: PartnerBalance[], payoutPartners: Record<string, string>) {
        return balances.filter((balance) => Object.keys(payoutPartners).includes(balance.id) && balance.currency === 'inr');
    }

    static async getAllPayoutPartnersBalance() {
        const data = await this.fetchBalances();
        const blc = this.filterPartnerBalances(data, PAYOUT_PARTNERS);

        if (!blc.length) return { data: ['Partners Balance: No partners found'], options: {} };

        const messageLines = blc.map(({ id, balance = 0, locked = 0 }) => {
            const partnerName = PAYOUT_PARTNERS[id];
            const total = +balance + +locked;

            return `*${partnerName}*: ${escapeTelegramEntities(
                formatNumber(total, { style: 'currency', currency: 'INR' })
            )}`;
        });

        return {
            data: [`*🏦 Partners Balance*\n\n${messageLines.join('\n')}`],
            options: {},
        };
    }

    // Fetch transactions from the API
    static async fetchTransactions(payload: PayoutPayloadInterface) {
        const { data = [] } = await AuthService.get('/admin/payout_requests', {
            from: payload.from,
            limit: payload.limit || 100,
            ordering: payload.ordering || 'asc',
            state: [payload.state],
            to: payload.to,
            type: 'fiat',
        });

        return data;
    }

    // Filter transactions for valid payout partners
    static filterPartnerTransactions(transactions: Payout[], partner_key?: string) {
        if (partner_key){
            return transactions.filter((transaction) => [partner_key].includes(transaction.gateway_reference_name))
        }

        return transactions.filter((transaction) =>
            Object.keys(PAYOUT_PARTNERS).includes(transaction.gateway_reference_name)
        );
    }

    // Group transactions by partner name
    static groupTransactionsByPartner(transactions: Payout[], payoutPartners: Record<string, string>) {
        return transactions.reduce((acc, transaction) => {
            const { gateway_reference_name } = transaction;
            const partnerName = payoutPartners[gateway_reference_name];

            if (!acc[partnerName]) {
                acc[partnerName] = [];
            }

            acc[partnerName].push(transaction);

            return acc;
        }, {} as Record<string, Payout[]>);
    }

    // Format individual transaction details
    static formatTransactionDetails(transaction: Payout) {
        const { tid, remote_id, amount, currency_id, state: status, created_at } = transaction;

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
    }

    // Generate a summary for each partner
    static generatePartnerSummary(partnerName: string, transactions: Payout[], state: string) {
        const totalAmount = transactions.reduce((sum, { amount }) => sum + +amount, 0.0);

        return [
            `*${partnerName} ${fnCapitalize(state)} Txn*\n\n${fnCapitalize(state)} Orders: *${formatNumber(transactions.length)}*\nOrder Amount: *${escapeTelegramEntities(formatNumber(totalAmount, {
                style: 'currency',
                currency: 'INR',
            }))}*\n`,
        ].concat(transactions.map((transaction) => this.formatTransactionDetails(transaction)));
    }

    // Generate the overall summary for all partners
    static generateOverallSummary(partnerTransactions: Payout[], state: string) {
        const totalAmount = partnerTransactions.reduce((sum, { amount }) => sum + +amount, 0);

        return [
            `*🏦 Partners ${fnCapitalize(state)} Transactions*\n\nTotal ${fnCapitalize(state)} Orders: *${formatNumber(partnerTransactions.length)}*\nTotal Order Amount: *${escapeTelegramEntities(formatNumber(totalAmount, {
                style: 'currency',
                currency: 'INR',
            }))}*\n`,
        ];
    }

    static async getAllPayoutPartnersTransactionsOverview(payload: PayoutPayloadInterface) {
        const transactions = await this.fetchTransactions(payload);
        const partnerTransactions = this.filterPartnerTransactions(transactions);
        const overallSummary = this.generateOverallSummary(partnerTransactions, payload.state);

        return {
            data: overallSummary,
            options: {},
        };
    }

    static async getPayoutPartnerTransactions(payload: PayoutPayloadInterface) {
        const transactions = await this.fetchTransactions(payload);
        const partnerTransactions = this.filterPartnerTransactions(transactions, payload.partner);

        const formattedData = this.generatePartnerSummary(PAYOUT_PARTNERS[payload.partner], partnerTransactions, payload.state);

        return {
            data: formattedData,
            options: {},
        };
    }

    // Main function to get all payout partners' transactions
    static async getAllPayoutPartnersTransactions(payload: PayoutPayloadInterface) {
        const transactions = await this.fetchTransactions(payload);
        const partnerTransactions = this.filterPartnerTransactions(transactions);
        const transactionsByPartner = this.groupTransactionsByPartner(partnerTransactions, PAYOUT_PARTNERS);
        const overallSummary = this.generateOverallSummary(partnerTransactions, payload.state);

        const formattedData = Object.entries(transactionsByPartner)
            .map(([partnerName, transactions]) =>
                this.generatePartnerSummary(partnerName, transactions, payload.state)
            )
            .flat();

        return {
            data: overallSummary.concat(formattedData),
            options: {},
        };
    }
}

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

    static async getAlphaTransactions(payload: PayoutPayloadInterface) {
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
                `*🏛️ AlphaGateway*\n\n${fnCapitalize(payload.state)} Orders: *${formatNumber(+data.length)}*\nOrder Amount: *${escapeTelegramEntities(formatNumber(totalAmount ?? 0, {
                    style: 'currency',
                    currency: 'INR',
                }))}*\n`,
            ].concat(formattedData),
            options: {},
        };
    }
}
