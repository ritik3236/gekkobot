import { BankRefund, Transaction } from '@/lib/db/schema';
import { escapeTelegramEntities, formatNumber } from '@/lib/utils';

export const buildMessagePayload = (data: Record<string, unknown>) => {
    return Object.entries(data)
        .map(([label, value]) => `${label}: ${value}`)
        .join('\n');
};

export const refundMessageBuilder = (refund: BankRefund) => {
    if (!refund) {
        return '\nRefund details not found';
    }

    const refundMsg = buildMessagePayload({
        'Id': refund.id,

        'Amount': escapeTelegramEntities(formatNumber(refund.amount, { style: 'currency', currency: 'INR' })),
        'Name': escapeTelegramEntities(refund.name),
        'Refund UTR': refund.refundUtr,
        'Transaction Date': escapeTelegramEntities(refund.txnDate),
    });

    return '```' + refund.id + '```\n' +
        '```' + refund.refundUtr + '```\n' +
        '```Refund_Details:\n' + refundMsg + '```';
};

export const transactionMessageBuilder = (transaction: Transaction) => {
    if (!transaction) {
        return '\nTransaction details not found';
    }

    const txnMsg = buildMessagePayload({
        'Transaction UUID': transaction.uuid,
        'S.No': transaction.sNo,
        'File': transaction.fileName,

        'Amount': escapeTelegramEntities(formatNumber(transaction.amount, { style: 'currency', currency: 'INR' })),
        'Account No': escapeTelegramEntities(transaction.accountNumber),
        'Name': escapeTelegramEntities(transaction.accountHolderName),
        'Status': transaction.status,
    });

    return '```' + transaction.uuid + '```\n' +
        '```Transaction_Details:\n' + txnMsg + '```';
};

export const refundAndTransactionMessageBuilder = (refund: BankRefund, transaction: Transaction) => {
    return refundMessageBuilder(refund)
        + '\n' + escapeTelegramEntities('=======================')
        + '\n' + transactionMessageBuilder(transaction);
};
