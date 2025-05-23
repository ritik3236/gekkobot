import { Update } from '@grammyjs/types';
import { NextResponse } from 'next/server';

import { OtcPriceUpdateBot } from '@/lib/telegram/otc-update';

export async function POST(req: Request): Promise<NextResponse> {
    console.log('Webhook hit at /api/telegram/otc_bot -', new Date().toISOString());

    try {
        const update: Update = await req.json();

        console.log('Received update:', JSON.stringify(update, null, 2));
        const chatId: number | undefined = update?.message?.chat?.id;

        if (!chatId) {
            return NextResponse.json({ success: false, error: 'No chat ID' });
        }

        if (!OtcPriceUpdateBot.bot.isInited()) {
            await OtcPriceUpdateBot.bot.init();
        }

        await OtcPriceUpdateBot.bot.handleUpdate(update);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in webhook:', error);

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
