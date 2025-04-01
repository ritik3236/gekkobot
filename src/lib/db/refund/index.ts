import axios from 'axios';

import { dbInstance } from '@/lib/db/client';
import { OCRBot } from '@/lib/telegram/bot-instances';
import { RefundOCRFields, RefundRequest } from '@/lib/types';
import { escapeTelegramEntities, formatNumber } from '@/lib/utils';

export const recordRefund = async (payload: RefundRequest) => {
    try {
        const { ocrText, eid, txnDate, name, amount, refundUtr, fileUrl } = payload;

        console.log('Recording refund:', { eid, ocrText, txnDate, name, amount, refundUtr, fileUrl });

        await dbInstance.recordRefund(payload);

    } catch (error) {
        console.error('Error recording refund:', error);
        throw error;
    }
};

const isOcrValid = (ocrText: string, fields: RefundOCRFields) => {
    return ocrText && fields && fields.eid && fields.txnDate && fields.name && fields.amount && fields.refundUtr;
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
            await ctx.api.editMessageText(chatId, messageId, 'Invalid OCR data\n```' + ocrText + '```', { parse_mode: 'MarkdownV2' });

            return;
        }

        // Step 4: Record in database
        await recordRefund({ ocrText: ocrText, fileUrl, ...fields });

        const msgPayload = {
            'Id': '`' + fields.eid + '`',

            'Amount': escapeTelegramEntities(formatNumber(fields.amount, { style: 'currency', currency: 'INR' })),
            'Name': escapeTelegramEntities(fields.name),
            'Refund Utr': '`' + fields.refundUtr + '`',
            'Transaction Date': escapeTelegramEntities(fields.txnDate),
        };

        const msg = Object.entries(msgPayload).map(([label, value]) => `${label}: ${value}`).join('\n');

        const successMessage = 'Refund Recorded Successfully 🎉\n' +
            'OCR text:\n```' + ocrText + '```\n' +
            'Refund details:\n```' + msg + '```';

        // Step 5: Send success message
        await ctx.api.editMessageText(chatId, messageId, successMessage, { parse_mode: 'MarkdownV2' });

    } catch (error) {
        console.error('Error in background processing:', error);
        await ctx.api.editMessageText(chatId, messageId, error.message || 'Error processing image');
    }
}
