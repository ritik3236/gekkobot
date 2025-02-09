import { NextRequest, NextResponse } from 'next/server';

import { YBotService } from '@/bots/ybot';
import { botsConfigs } from '@/lib/configs';

let ybot: YBotService | null = null;
let ybotInitializationPromise: Promise<void> | null = null;

async function initializeBot() {
    if (!ybot) {
        ybot = new YBotService(botsConfigs[1]);
        await ybot.initialize();
    }
}

export async function POST(req: NextRequest) {
    const token = req.headers.get('x-telegram-bot-api-secret-token');

    if (token !== process.env.TELEGRAM_SECRET_TOKEN) {
        console.warn('Unauthorized access attempt', {
            receivedToken: token,
            expectedToken: process.env.TELEGRAM_SECRET_TOKEN ? 'ARDqi****CebDF' : 'undefined',
        });

        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (!ybotInitializationPromise) {
            ybotInitializationPromise = initializeBot().catch((error) => {
                console.error('Initialization failed:', error);
                ybotInitializationPromise = null;
                throw error;
            });
        }
        await ybotInitializationPromise;

        const body = await req.json();

        console.log('Received update:', body);

        if (ybot) {
            ybot.bot.processUpdate(body);
        } else {
            console.error('Bot not initialized before processing update');

            return NextResponse.json(
                { error: 'Bot initialization failed' },
                { status: 500 }
            );
        }

        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error('Error handling request:', error);

        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
