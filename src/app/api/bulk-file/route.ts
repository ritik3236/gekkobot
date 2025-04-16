import axios from 'axios';
import { InputFile } from 'grammy';
import { NextResponse } from 'next/server';

import { setCorsHeaders } from '@/lib/middleware';
import { OCRBot } from '@/lib/telegram/bot-instances';
import { buildBulkPayoutPreProccessMsg } from '@/lib/telegram/messageBulider';
import { BulkPayoutInterface } from '@/lib/types';

const CHAT_ID = '-4770924782';
const TestChatId = '1282110140';

interface BulkPayoutResponse {
    data: BulkPayoutInterface;
    file_url: string
}

export async function OPTIONS(): Promise<Response> {
    return setCorsHeaders(new NextResponse(null, { status: 204 }));
}

export async function POST(req: Request): Promise<Response> {
    try {
        // Parse the incoming JSON containing a file_url URL
        const { file_url, data }: BulkPayoutResponse = await req.json();

        // Validate that the file_url is an absolute URL
        if (!file_url.startsWith('http://') && !file_url.startsWith('https://')) {
            throw new Error(`Invalid URL provided: ${file_url}`);
        }

        // Fetch the file as binary data (arraybuffer) instead of stream
        const response = await axios.get(file_url, { responseType: 'arraybuffer' });

        // Convert the response to a Node.js Buffer
        const buffer = Buffer.from(response.data);

        // Create an InputFile from the buffer, ensuring Telegram sees it as a file
        const inputFile = new InputFile(buffer, data.id);

        // Send the document to Telegram
        await OCRBot.bot.api.sendDocument(TestChatId, inputFile);
        const msg = buildBulkPayoutPreProccessMsg(data);

        await OCRBot.sendMessage(TestChatId, msg, 'OCR_BOT', { parse_mode: 'MarkdownV2' });

        return setCorsHeaders(NextResponse.json({ success: true }));

    } catch (error) {
        console.error('Failed to send document to Telegram:', error);

        return setCorsHeaders(NextResponse.json({
            error: 'OCR processing failed',
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    }
}
