import { Update } from '@grammyjs/types';
import { NextResponse } from 'next/server';

import { UtrBot } from '@/lib/telegram/utr-bot-instance';

export async function POST(req: Request): Promise<NextResponse> {
    console.log('Webhook hit at /api/telegram/bulk_bot -', new Date().toISOString());

    try {
        const update: Update = await req.json();

        console.log('Received update:', JSON.stringify(update, null, 2));
        const chatId: number | undefined = update?.message?.chat?.id;

        if (!chatId) {
            return NextResponse.json({ success: false, error: 'No chat ID' });
        }

        if (!UtrBot.bot.isInited()) {
            await UtrBot.bot.init();
        }

        await UtrBot.bot.handleUpdate(update);

        console.log('Done');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in webhook:', error);

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
