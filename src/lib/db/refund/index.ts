import axios from 'axios';

import { dbInstance } from '@/lib/db/client';
import { Transaction } from '@/lib/db/schema';
import { OCRBot } from '@/lib/telegram/bot-instances';
import { buildMessagePayload, refundMessageBuilder, transactionMessageBuilder } from '@/lib/telegram/messageBulider';
import { RefundOCRFields, RefundRequest } from '@/lib/types';
import { escapeTelegramEntities, formatNumber } from '@/lib/utils';

const recordRefund = async (payload: RefundRequest) => {
    try {
        const recordedRefund = await dbInstance.recordRefund(payload);

        return { data: recordedRefund, error: null };

    } catch (error) {
        if (error.message.includes('Duplicate entry')) {
            const refund = await dbInstance.getRefundByEid(payload.uuid);

            return { data: refund, error: 'Duplicate entry' };
        }
    }
};

const isOcrValid = (ocrText: string, fields: RefundOCRFields): boolean => {
    return !!(ocrText && fields?.txnDate && fields?.name && fields?.amount && fields?.refundUtr);
};

export async function processImageInBackground(chatId: number, fileId: string, ctx: any) {
    let messageId: number | undefined;

    try {
        console.log('Starting background processing for fileId:', fileId);

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

        // Step 4: Record refund
        const { data, error } = await recordRefund({ ocrText, fileUrl, ...fields });

        const refundMsg = refundMessageBuilder(data);
        const successMessage = error ? 'Refund already exists\n\n' + refundMsg : 'Refund Recorded Successfully 🎉\n\n' + refundMsg;

        await ctx.api.editMessageText(chatId, messageId, successMessage, { parse_mode: 'MarkdownV2' });

        // Step 5: Trigger refund update
        const { data: transactionResponse } = await axios.post(`${process.env.VERCEL_BASE_URL}/api/transactions/refund-update`, { refund_uuid: data.uuid });
        const { data: transaction, error: transactionError } = transactionResponse;

        if (Array.isArray(transaction) && transaction.length > 1) {
            const multipleTxnMsg = transaction
                .map((txn: Transaction) => buildMessagePayload({
                    'Id': txn.id,
                    'S.No': txn.sNo,
                    'File': txn.fileName,
                    'Amount': formatNumber(txn.amount, {
                        style: 'currency',
                        currency: 'INR',
                    }),
                    'Account No': txn.accountNumber,
                    'Name': txn.accountHolderName,
                    'Status': txn.status,
                }))
                .join('\n\n');

            await ctx.reply('Error\\: Multiple transactions found\\, please update manually\n\n' + '```Transactions_Details\n' + multipleTxnMsg + '```', { parse_mode: 'MarkdownV2' });

            return;
        }

        if (transactionError) {
            console.error('Transaction update failed:', transactionError);
            await ctx.reply(`Error: ${transactionError}`);

            return;
        }

        const txnMsg = transactionMessageBuilder(transaction);

        await ctx.api.editMessageText(chatId, messageId,
            `${successMessage}\n` + escapeTelegramEntities('\n==============\n') + `\n${txnMsg}`,
            { parse_mode: 'MarkdownV2' });

    } catch (error) {
        console.error('Error in background processing:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error processing image';

        await ctx.reply(`Processing failed: ${errorMessage}`);
    }
}
