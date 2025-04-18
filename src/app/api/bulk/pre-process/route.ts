import axios from 'axios';
import { InputFile } from 'grammy';
import { NextResponse } from 'next/server';

import { setCorsHeaders } from '@/lib/middleware';
import { BulkBot } from '@/lib/telegram/bot-bulk-instance';
import { buildBulkPayoutPreProcessMsg } from '@/lib/telegram/messageBulider';
import { BulkPayoutInterface } from '@/lib/types';

const TestChatId = '1282110140';
const CHAT_ID = process.env.BULK_FILE_GROUP_ID || TestChatId;

interface BulkPayoutResponse {
    data: BulkPayoutInterface;
    file_url: string
}

export async function POST(req: Request): Promise<Response> {
    try {
        let chat_id = CHAT_ID;
        // Parse the incoming JSON containing a file_url URL
        const { file_url, data }: BulkPayoutResponse = await req.json();

        // Validate that the file_url is an absolute URL
        if (!file_url.startsWith('http://') && !file_url.startsWith('https://')) {
            throw new Error(`Invalid URL provided: ${file_url}`);
        }

        const { hostname } = new URL(req.headers.get('origin'));

        // check if origin come from test server
        if (['pay.coinfinacle.com', 'localhost'].includes(hostname)) {
            chat_id = TestChatId;
        }

        // Fetch the file as binary data (arraybuffer) instead of stream
        const response = await axios.get(file_url, { responseType: 'arraybuffer' });

        // Convert the response to a Node.js Buffer
        const buffer = Buffer.from(response.data);

        // Create an InputFile from the buffer, ensuring Telegram sees it as a file
        const inputFile = new InputFile(buffer, data.id + '.xlsx');

        const msg = buildBulkPayoutPreProcessMsg(data);

        // Send the document to Telegram
        await BulkBot.bot.api.sendDocument(chat_id, inputFile, {
            caption: msg,
            parse_mode: 'MarkdownV2',
        });

        return setCorsHeaders(NextResponse.json({ success: true }));

    } catch (error) {
        console.error('Failed to send document to Telegram:', error);

        return setCorsHeaders(NextResponse.json({
            error: 'OCR processing failed',
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    }
}

export async function OPTIONS(): Promise<Response> {
    return setCorsHeaders(new NextResponse(null, { status: 204 }));
}
