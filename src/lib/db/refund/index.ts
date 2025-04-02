import axios from 'axios';

import { dbInstance } from '@/lib/db/client';
import { BankRefund, Transaction } from '@/lib/db/schema';
import { OCRBot } from '@/lib/telegram/bot-instances';
import { buildRefundMsg, buildTransactionMsg } from '@/lib/telegram/messageBulider';
import { RefundOCRFields, RefundRequest } from '@/lib/types';
import { escapeTelegramEntities } from '@/lib/utils';

const REFUND_STATUS = 'REFUND_IN_REVIEW';

const RECORD_NOT_FOUND = 'RECORD_NOT_FOUND';
const RECORD_MULTIPLE_FOUND = 'RECORD_MULTIPLE_FOUND';
const RECORD_UPDATED = 'RECORD_UPDATED';
const RECORD_UPDATED_ALREADY = 'RECORD_UPDATED_ALREADY';
const RECORD_CREATED = 'RECORD_CREATED';
const RECORD_CREATED_ALREADY = 'RECORD_CREATED_ALREADY';

const recordRefund = async (refundReq: RefundRequest) => {
    const existingRefund = await dbInstance.getRefundById(refundReq.uuid);

    if (existingRefund) {
        return { record: existingRefund, message: RECORD_CREATED_ALREADY };
    }

    const record = await dbInstance.recordRefund(refundReq);

    return { record, message: RECORD_CREATED };
};

const updateTransaction = async (refund: BankRefund) => {
    const transactions = await dbInstance.getTransactionByNameAndAmount(refund.name, refund.amount);

    if (!transactions?.length) {
        return { records: null, updated: false, message: RECORD_NOT_FOUND };
    }

    if (transactions.length > 1) {
        return { records: transactions, updated: false, message: RECORD_MULTIPLE_FOUND };
    }

    const transactionToUpdate = transactions[0];

    if (transactionToUpdate.bankRefundUuid) {
        return { records: [transactionToUpdate], updated: false, message: RECORD_UPDATED_ALREADY };
    }

    const updatedTransaction = await dbInstance.updateTransaction({
        id: transactionToUpdate.id,
        status: REFUND_STATUS,
        bankRefundUuid: refund.uuid,
    });

    return { records: [updatedTransaction], updated: true, message: RECORD_UPDATED };
};

const updateRefund = async (refund: BankRefund, transaction: Transaction) => {
    if (refund.transactionUuid) {
        return { record: refund, updated: false, message: RECORD_UPDATED_ALREADY };
    }

    const updatedRefund = await dbInstance.updateRefund({
        id: refund.id,

        fileName: transaction.fileName,
        sNo: transaction.sNo,
        transactionUuid: transaction.uuid,
    });

    return { record: updatedRefund, updated: true, message: RECORD_UPDATED };
};

// Image -> OCR -> Refund Table (r_uuid) -> Transaction Table (r_uuid) (status: REFUND_IN_REVIEW) -> Refund Table (t_uuid) (file_name) (s_no)

const isOcrValid = (ocrText: string, fields: RefundOCRFields): boolean => {
    return !!(ocrText && fields?.txnDate && fields?.name && fields?.amount && fields?.refundUtr);
};

export async function processImageInBackground(chatId: number, fileId: string, ctx: any) {
    let messageId: number | undefined;
    let telegramMsg = '';

    try {
        // Step 1: Send initial processing message
        const processingMsg = await ctx.reply('Processing your image...');

        messageId = processingMsg.message_id;

        // Step 2: Download image
        const fileUrl = await OCRBot.getFileUrl(fileId);

        // Step 3: Process OCR
        const { data: ocrData } = await axios.post(`${process.env.VERCEL_BASE_URL}/api/process-ocr`, {
            imagePath: fileUrl,
        });

        const { ocrText, fields } = ocrData;

        if (!isOcrValid(ocrText, fields)) {
            console.error('Invalid OCR data:', ocrData);
            await ctx.api.editMessageText(chatId, messageId, 'Invalid OCR data\n```' + ocrText + '\n Invalid data```', { parse_mode: 'MarkdownV2' });

            return;
        }

        fields.txnDate = new Date(fields.txnDate);
        // Step 4: Record refund
        const { record: refund, message: refundMsg } = await recordRefund({ ocrText, fileUrl, ...fields });

        switch (refundMsg) {
            case RECORD_CREATED_ALREADY:
                telegramMsg = telegramMsg + 'Refund already exists';
                break;
            case RECORD_CREATED:
                telegramMsg = telegramMsg + 'Refund Recorded';
        }

        const { records, message: transactionUpdateMsg } = await updateTransaction(refund);

        if ([RECORD_UPDATED_ALREADY, RECORD_UPDATED].includes(transactionUpdateMsg)) {
            const { record: updatedRefund, message: refundUpdateMsg } = await updateRefund(refund, records[0]);

            switch (refundUpdateMsg) {
                case RECORD_UPDATED_ALREADY:
                    telegramMsg = telegramMsg + ' \\& already updated\n\n' + buildRefundMsg(updatedRefund) + '\n';
                    break;
                case RECORD_UPDATED:
                    telegramMsg = telegramMsg + ' \\& updated successfully 🎉\n\n' + buildRefundMsg(updatedRefund) + '\n';
            }
        } else {
            telegramMsg = telegramMsg + buildRefundMsg(refund) + '\n';
        }

        telegramMsg = telegramMsg + escapeTelegramEntities('\n==============\n\n');

        switch (transactionUpdateMsg) {
            case RECORD_NOT_FOUND:
                telegramMsg = telegramMsg + 'Transaction not found\n';
                break;
            case RECORD_MULTIPLE_FOUND:
                const multipleTxnMsg = records
                    .map((txn: Transaction) => buildTransactionMsg(txn))
                    .join('\n\n');

                telegramMsg = telegramMsg + 'Error\\: Multiple transactions found\\, please update manually\n\n' + 'Transactions\\_Details\n' + multipleTxnMsg + '\n';
                break;
            case RECORD_UPDATED_ALREADY:
                telegramMsg = telegramMsg + 'Transaction already updated\n' + buildTransactionMsg(records[0]) + '\n';
                break;
            case RECORD_UPDATED:
                telegramMsg = telegramMsg + 'Transaction updated successfully 🎉\n' + buildTransactionMsg(records[0]) + '\n';
                break;
        }

        await ctx.api.editMessageText(chatId, messageId, telegramMsg, { parse_mode: 'MarkdownV2' });
    } catch (error) {
        console.error('Error in background processing:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error processing image';

        await ctx.reply(`Processing failed: ${errorMessage}`);
    }
}
