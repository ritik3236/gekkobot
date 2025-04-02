import { BankRefund, Transaction } from '@/lib/db/schema';
import { localeDate } from '@/lib/localeDate';
import { escapeTelegramEntities, formatNumber } from '@/lib/utils';

export const buildMessagePayload = (data: Record<string, unknown>) => {
    return Object.entries(data)
        .map(([label, value]) => `${label}: ${value}`)
        .join('\n');
};

export const buildRefundMsg = (refund: BankRefund) => {
    if (!refund) {
        return '\nRefund details not found';
    }

    const refundMsg = buildMessagePayload({
        'Id': refund.id,

        'Amount': escapeTelegramEntities(formatNumber(refund.amount, { style: 'currency', currency: 'INR' })),
        'Name': escapeTelegramEntities(refund.name),
        'Refund UTR': refund.refundUtr,
        'Transaction Date': localeDate(refund.txnDate, 'dmy'),

        'File Name': escapeTelegramEntities(refund.fileName) || '-',
        'S.No': refund.sNo || '-',
        'Transaction UUID': escapeTelegramEntities(refund.transactionUuid) || '-',
    });

    return '```' + refund.id + '```\n' +
        '```' + refund.refundUtr + '```\n' +
        '```Refund_Details:\n' + refundMsg + '```';
};

export const buildTransactionMsg = (transaction: Transaction) => {
    if (!transaction) {
        return '\nTransaction details not found';
    }

    const txnMsg = buildMessagePayload({
        'Transaction UUID': transaction.uuid,
        'File Name': transaction.fileName,
        'S.No': transaction.sNo,

        'Account No': escapeTelegramEntities(transaction.accountNumber),
        'Name': escapeTelegramEntities(transaction.accountHolderName),
        'Amount': escapeTelegramEntities(formatNumber(transaction.amount, { style: 'currency', currency: 'INR' })),
        'Status': transaction.status,
        'Transaction Date': localeDate(transaction.txnDate, 'dmy'),

        'Refund UUID': transaction.bankRefundUuid || '-',
    });

    return '```' + transaction.uuid + '```\n' +
        '```Transaction_Details:\n' + txnMsg + '```';
};

export const buildRefundAndTransactionMsg = (refund: BankRefund, transaction: Transaction) => {
    return buildRefundMsg(refund)
        + '\n' + escapeTelegramEntities('=======================')
        + '\n' + buildTransactionMsg(transaction);
};
