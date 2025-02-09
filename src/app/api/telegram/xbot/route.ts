import { NextRequest, NextResponse } from 'next/server';

import { PayoutXService } from '@/bots/xbot';
import { botsConfigs } from '@/lib/configs';

const xbot = new PayoutXService(botsConfigs[1]);

xbot.initialize();

export async function POST(req: NextRequest) {
    const token = req.headers.get('x-telegram-bot-api-secret-token');

    if (token !== process.env.TELEGRAM_SECRET_TOKEN) {
        console.log('Unauthorized', token, process.env.TELEGRAM_SECRET_TOKEN);

        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const body = await req.json();

        console.log('Received update:', body);

        // Process the update through your bot
        xbot.bot.processUpdate(body);

        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error('Error handling Telegram update:', error);

        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
