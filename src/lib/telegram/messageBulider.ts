import { UpdateResult } from '@/app/api/otc-deal/route';
import { BankFileTransaction, BankRefund, Transaction } from '@/lib/db/schema';
import { localeDate } from '@/lib/localeDate';
import { BulkPayoutInterface } from '@/lib/types';
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

export const buildBulkPayoutPreProcessMsg = (bulkPayout: BulkPayoutInterface) => {
    if (!bulkPayout) {
        return '\nBulk Payout details not found';
    }

    const bulkPayoutMsg = buildMessagePayload({
        'File Name': escapeTelegramEntities(bulkPayout.id),
        'File Format': escapeTelegramEntities(bulkPayout.file_format),
        'Transaction Count': bulkPayout.payout_count,
        'Total Amount': escapeTelegramEntities(formatNumber(bulkPayout.total_amount, {
            style: 'currency',
            currency: 'INR',
        })),
    });

    return '```' + bulkPayout.id + '```\n' +
        '```File_Details:\n' + bulkPayoutMsg + '```';
};

export const utrProcessMsg = (payload: Partial<BankFileTransaction>) => {
    if (!payload) {
        return '\nTransaction details not found';
    }

    const txnMsg = buildMessagePayload({
        'Status': payload.status,
        'Txid': payload.uuid,
        'File Name': payload.fileName,
        'UTR': payload.utr,
        'S.No': payload.sNo,

        'Account No': escapeTelegramEntities(payload.accountNumber),
        'Name': escapeTelegramEntities(payload.accountHolderName),
        'Amount': formatNumber(payload.amount, { style: 'currency', currency: 'INR' }),
        'Transaction Date': localeDate(payload.txnDate, 'dmy'),
    });

    return '```' + payload.accountNumber + '```\n' +
        '```Transaction_Details:\n' + txnMsg + '```';   
};

export const buildOtcUpdateMsg = (result: UpdateResult) => {
    if (!result) {
        return '\nOtc update details not found';
    }

    const updateMsg = buildMessagePayload({
        'Old Deal Id': result.dealId,
        'Old Price': escapeTelegramEntities(formatNumber(result.oldPrice, {
            style: 'currency',
            currency: 'INR',
        }) || '-'),
        'New Deal Id': result.newDealId || '-',
        'New Price': escapeTelegramEntities(formatNumber(result.newPrice, {
            style: 'currency',
            currency: 'INR',
        }) || '-'),
        'Action': escapeTelegramEntities(result.action),
        'Message': escapeTelegramEntities(result.reason),
    });

    return '```Otc_Update_Details:\n' + updateMsg + '```';
};
