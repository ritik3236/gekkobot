import sharp from 'sharp';
import { recognize } from 'tesseract.js';

import { TelegramBotService } from '@/lib/telegram/bot';

import { extractDate, extractAmount, extractUTR, extractName } from './extractors';

export interface RefundData {
    date: Date
    name: string
    amount: number
    utr: string
}

export async function processRefund(fileId: string): Promise<RefundData> {
    try {
        const fileUrl = await TelegramBotService.bot.getFileLink(fileId);
        const response = await fetch(fileUrl);
        const buffer = await response.arrayBuffer();

        const processedImage = await sharp(buffer)
            .greyscale()
            .normalise()
            .sharpen()
            .toBuffer();

        const { data: { text } } = await recognize(
            processedImage,
            'eng',
            { logger: (m) => console.log(m.status) }
        );

        return {
            date: extractDate(text),
            name: extractName(text),
            amount: extractAmount(text),
            utr: extractUTR(text),
        };
    } catch (error) {
        console.error('OCR Processing Error:', error);
        throw new Error('OCR processing failed');
    }
}
