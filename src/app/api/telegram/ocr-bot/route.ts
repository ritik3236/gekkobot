import { Update } from '@grammyjs/types';
import { NextResponse } from 'next/server';

import { OCRBot } from '@/lib/telegram/bot-instances';

export async function POST(req: Request): Promise<NextResponse> {
    console.log('Webhook hit at /api/telegram/ocr_bot -', new Date().toISOString());

    try {
        const update: Update = await req.json();

        console.log('Received update:', JSON.stringify(update, null, 2));
        const chatId: number | undefined = update?.message?.chat?.id;

        if (!chatId) {
            return NextResponse.json({ success: false, error: 'No chat ID' });
        }

        if (!OCRBot.bot.isInited()) {
            await OCRBot.bot.init();
        }

        await OCRBot.bot.handleUpdate(update);

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
