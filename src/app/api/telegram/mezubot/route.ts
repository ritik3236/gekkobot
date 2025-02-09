import { NextRequest, NextResponse } from 'next/server';

import { PayoutXService } from '@/bots/xbot';
import { botsConfigs } from '@/lib/configs';

let mezubot: PayoutXService | null = null;
let initializationPromise: Promise<void> | null = null;

async function initializeBot() {
    if (!mezubot) {
        mezubot = new PayoutXService(botsConfigs[1]);
        await mezubot.initialize();
        console.log('Mezu bot initialized');
    }
}

export async function POST(req: NextRequest) {
    // Verify secret token first
    const token = req.headers.get('x-telegram-bot-api-secret-token');

    if (token !== process.env.TELEGRAM_SECRET_TOKEN) {
        console.warn('Unauthorized access attempt', {
            receivedToken: token,
            expectedToken: process.env.TELEGRAM_SECRET_TOKEN ? '***' : 'undefined',
        });

        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Lazy initialization with singleton pattern
        if (!initializationPromise) {
            initializationPromise = initializeBot().catch((error) => {
                console.error('Initialization failed:', error);
                initializationPromise = null; // Reset to allow retry
                throw error;
            });
        }
        await initializationPromise;

        const body = await req.json();

        console.log('Received update:', body);

        // Process update
        if (mezubot) {
            mezubot.bot.processUpdate(body);
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
