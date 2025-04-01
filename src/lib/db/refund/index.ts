import axios from 'axios';

import { dbInstance } from '@/lib/db/client';
import { OCRBot } from '@/lib/telegram/bot-instances';
import { RefundOCRFields, RefundRequest } from '@/lib/types';
import { escapeTelegramEntities, formatNumber } from '@/lib/utils';

export const recordRefund = async (payload: RefundRequest) => {
    return await dbInstance.recordRefund(payload);
};

const isOcrValid = (ocrText: string, fields: RefundOCRFields): boolean => {
    return !!(ocrText && fields?.txnDate && fields?.name && fields?.amount && fields?.refundUtr);
};

const buildMessagePayload = (data: Record<string, unknown>) => {
    return Object.entries(data)
        .map(([label, value]) => `${label}: ${value}`)
        .join('\n');
};

export async function processImageInBackground(chatId: number, fileId: string, ctx: any) {
    let messageId: number | undefined;

    try {
        console.log('Starting background processing for fileId:', fileId);

        // Step 1: Send initial processing message
        const processingMsg = await ctx.reply('Processing your image...');

        messageId = processingMsg.message_id;

        // Step 2: Download image
        console.time('Image download');
        const fileUrl = await OCRBot.getFileUrl(fileId);

        console.timeEnd('Image download');
        console.log('Image downloaded:', fileUrl);

        // Step 3: Process OCR
        console.time('OCR processing');
        const { data: ocrData } = await axios.post(`${process.env.VERCEL_BASE_URL}/api/process-ocr`, {
            imagePath: fileUrl,
        });

        console.timeEnd('OCR processing');

        const { ocrText, fields } = ocrData;

        if (!isOcrValid(ocrText, fields)) {
            console.error('Invalid OCR data:', ocrData);
            await ctx.api.editMessageText(chatId, messageId, 'Invalid OCR data\n```' + ocrText + '\n Invalid data```', { parse_mode: 'MarkdownV2' });

            return;
        }

        // Step 4: Record refund
        console.time('Refund recording');
        const refund = await recordRefund({ ocrText, fileUrl, ...fields });

        console.timeEnd('Refund recording');

        // Build and send success message
        const refundMsg = buildMessagePayload({
            'Id': refund.id,

            'Amount': escapeTelegramEntities(formatNumber(fields.amount, { style: 'currency', currency: 'INR' })),
            'Name': escapeTelegramEntities(fields.name),
            'Refund UTR': fields.refundUtr,
            'Transaction Date': escapeTelegramEntities(fields.txnDate),
        });

        const successMessage = 'Refund Recorded Successfully 🎉\n\n' +
            '```Refund_Details:\n' + refundMsg + '```\n' +
            '```' + refund.id + '```\n' +
            '```' + refund.refundUtr + '```';

        await ctx.api.editMessageText(chatId, messageId, successMessage, { parse_mode: 'MarkdownV2' });

        // Step 5: Trigger refund update
        console.time('Transaction update');
        const { data: transactionResponse } = await axios.post(
            `${process.env.VERCEL_BASE_URL}/api/transactions/refund-update`,
            { refund_uuid: refund.uuid }
        );

        console.timeEnd('Transaction update');

        const { data: transaction, error: transactionError } = transactionResponse;

        if (!transaction || transactionError) {
            console.error('Transaction update failed:', transactionError);
            await ctx.reply(`Error: ${transactionError}`);

            return;
        }

        // Build and send transaction message
        const transactionMsg = buildMessagePayload({
            'Id': transaction.id,
            'S.No': transaction.sNo,
            'File': transaction.fileName,
            'Amount': escapeTelegramEntities(formatNumber(transaction.amount, { style: 'currency', currency: 'INR' })),
            'Account No': transaction.accountNumber,
            'Name': escapeTelegramEntities(transaction.accountHolderName),
            'Status': escapeTelegramEntities(transaction.status),
        });

        const transactionSuccessMessage = 'Transaction Updated Successfully 🎉\n\n' +
            '```Transaction_Details:\n' + transactionMsg + '```\n' +
            '```' + transaction.id + '```';

        await ctx.api.editMessageText(chatId, messageId, `${successMessage}\n ============== \n${transactionSuccessMessage}`, { parse_mode: 'MarkdownV2' });

    } catch (error) {
        console.error('Error in background processing:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error processing image';

        if (messageId) {
            await ctx.api.editMessageText(chatId, messageId, `Processing failed: ${escapeTelegramEntities(errorMessage)}`, { parse_mode: 'MarkdownV2' });
        } else {
            await ctx.reply(`Processing failed: ${errorMessage}`);
        }
    }
}
