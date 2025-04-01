import axios from 'axios';

import { dbInstance } from '@/lib/db/client';
import { Transaction } from '@/lib/db/schema';
import { OCRBot } from '@/lib/telegram/bot-instances';
import { RefundOCRFields, RefundRequest } from '@/lib/types';
import { escapeTelegramEntities, formatNumber } from '@/lib/utils';

export const recordRefund = async (payload: RefundRequest) => {
    return await dbInstance.recordRefund(payload);
};

const isOcrValid = (ocrText: string, fields: RefundOCRFields) => {
    return ocrText && fields && fields.txnDate && fields.name && fields.amount && fields.refundUtr;
};

// Background processing function
export async function processImageInBackground(chatId: number, fileId: string, ctx: any) {
    let messageId: number | undefined;

    try {
        console.log('Starting background processing for fileId:', fileId);

        // Step 1: Send initial "Processing..." message
        const processingMsg = await ctx.reply('Processing your image...');

        messageId = processingMsg.message_id;

        // Step 2: Download image
        const fileUrl: string = await OCRBot.getFileUrl(fileId);

        console.log('Image downloaded:', fileUrl);

        // Step 3: Process OCR
        const ocrData = await axios.post(`${process.env.VERCEL_BASE_URL}/api/process-ocr`, { imagePath: fileUrl });

        const { ocrText, fields } = ocrData.data;

        const isValid = isOcrValid(ocrText, fields);

        if (!isValid) {
            console.error('Invalid OCR data:', ocrData.data);
            await ctx.api.editMessageText(chatId, messageId, 'Invalid OCR data\n```' + ocrText + '\n Invalid data```', { parse_mode: 'MarkdownV2' });

            return;
        }

        // Step 4: Record in database
        const refund = await recordRefund({ ocrText: ocrText, fileUrl, ...fields });

        const msgPayload = {
            'Id': refund.id,

            'Amount': escapeTelegramEntities(formatNumber(fields.amount, { style: 'currency', currency: 'INR' })),
            'Name': escapeTelegramEntities(fields.name),
            'Refund UTR': fields.refundUtr,
            'Transaction Date': escapeTelegramEntities(fields.txnDate),
        };

        const msg = Object.entries(msgPayload).map(([label, value]) => `${label}: ${value}`).join('\n');

        const successMessage = 'Refund Recorded Successfully 🎉\n\n' +
            '```Refund_Details:\n' + msg + '```\n' + '```' + refund.id + '```\n' + '```' + refund.refundUtr + '```';

        // Step 6: Trigger refund update
        await ctx.api.editMessageText(chatId, messageId, successMessage, { parse_mode: 'MarkdownV2' });

        const transactionResponse = await axios.post(`${process.env.VERCEL_BASE_URL}/api/transactions/refund-update`, { refund_uuid: refund.uuid });

        const transaction = transactionResponse.data.data as Transaction;
        const transactionError = transactionResponse.data.error;

        if (!transaction || transactionError) {
            await ctx.reply(`Error: ${transactionError}`);

            return;
        }

        const transactionMsgPayload = {
            'Id': transaction.id,
            'S.No': transaction.sNo,
            'File': transaction.fileName,
            'Amount': escapeTelegramEntities(formatNumber(transaction.amount, {
                style: 'currency',
                currency: 'INR',
            })),
            'Account No': transaction.accountNumber,
            'Name': escapeTelegramEntities(transaction.accountHolderName),
            'Status': escapeTelegramEntities(transaction.status),
        };

        const transactionMsg = Object.entries(transactionMsgPayload).map(([label, value]) => `${label}: ${value}`).join('\n');

        const transactionSuccessMessage = 'Transaction Updated Successfully 🎉\n\n' +
            '```Transaction_Details:\n' + transactionMsg + '```\n' + '```' + transaction.id + '```';

        await ctx.api.editMessageText(chatId, messageId, successMessage + '\n\n' + transactionSuccessMessage, { parse_mode: 'MarkdownV2' });

    } catch (error) {
        console.error('Error in background processing:', error);
        await ctx.reply(error.message || 'Error processing image');
    }
}
