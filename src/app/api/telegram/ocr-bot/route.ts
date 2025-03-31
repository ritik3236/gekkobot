import { Update } from '@grammyjs/types';
import axios from 'axios';
import { NextResponse } from 'next/server';

import { recordRefund } from '@/lib/db/refund';
import { OCRBot } from '@/lib/telegram/bot-instances';
import { escapeTelegramEntities, formatNumber } from '@/lib/utils';

const BASE_URL: string = process.env.VERCEL_BASE_URL || 'http://localhost:3000';

// Background processing function
async function processImageInBackground(chatId: number, fileId: string) {
    try {
        console.log('Starting background processing for fileId:', fileId);

        // Step 1: Download image
        const fileUrl: string = await OCRBot.getFileUrl(fileId);

        console.log('Image downloaded:', fileUrl);

        // Step 2: Process OCR
        const { data: { ocrText, fields } } = await axios.post(`${BASE_URL}/api/process-ocr`, { imagePath: fileUrl });

        // Step 3: Record in database
        await recordRefund({ ocrText: ocrText, fileUrl, ...fields });
        await OCRBot.sendMessage(chatId, 'Refund Record added successfully', 'OCR_BOT');

        await OCRBot.sendMessage(chatId, 'OCR text:\n```' + ocrText + '```', 'OCR_BOT', { parse_mode: 'MarkdownV2' });

        const msgPayload = {
            '\\- *Id*': '`' + fields.uniqueId + '`',

            '\\- *Amount*': escapeTelegramEntities(formatNumber(fields.amount, { style: 'currency', currency: 'INR' })),
            '\\- *Name*': escapeTelegramEntities(fields.name),
            '\\- *Refund Utr*': '`' + fields.refundUtr + '`',
            '\\- *Transaction Date*': escapeTelegramEntities(fields.txnDate),
        };

        const msg = Object.entries(msgPayload).map(([label, value]) => `${label}: ${value}`).join('\n');

        await OCRBot.sendMessage(chatId, msg, 'OCR_BOT', { parse_mode: 'MarkdownV2' });

    } catch (error) {
        console.error('Error in background processing:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            await OCRBot.sendMessage(chatId, error?.message || 'Error duplicate entry', 'OCR_BOT');

            return;
        }

        await OCRBot.sendMessage(chatId, 'Error processing image', 'OCR_BOT');
    }
}

export async function POST(req: Request): Promise<NextResponse> {
    console.log('Webhook hit at /api/telegram/ocr_bot -', new Date().toISOString());

    try {
        const update: Update = await req.json();

        console.log('Received update:', JSON.stringify(update, null, 2));
        const chatId: number | undefined = update?.message?.chat?.id;
        const photo: { file_id: string }[] | undefined = update?.message?.photo;
        const text: string | undefined = update?.message?.text;

        console.log('Chat ID:', chatId, 'Photo:', photo);

        if (!chatId) {
            return NextResponse.json({ success: false, error: 'No chat ID' });
        }

        if (text?.startsWith('/')) {
            if (!OCRBot.bot.isInited()) {
                await OCRBot.bot.init();
            }

            await OCRBot.bot.handleUpdate(update);

            return NextResponse.json({ success: true });
        }

        if (!photo) {
            await OCRBot.sendMessage(chatId, 'Please send an image.');

            return NextResponse.json({ success: true });
        }

        const fileId: string = photo[photo.length - 1].file_id;

        console.log('Photo detected, fileId:', fileId);

        // Send immediate response to Telegram
        await OCRBot.sendMessage(chatId, 'Image received, processing in background...', 'OCR_BOT');

        // Start background processing without awaiting it
        await processImageInBackground(chatId, fileId).catch((err) => {
            console.error('Background process failed:', err);
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in webhook:', error);
        const update: Update = await req.json();
        const chatId: number | undefined = update?.message?.chat?.id;

        if (chatId) {
            await OCRBot.sendMessage(chatId, 'Error receiving image.');
        }

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
