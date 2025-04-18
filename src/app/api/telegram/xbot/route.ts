import { NextRequest, NextResponse } from 'next/server';

import { XBotService } from '@/bots/xbot';
import { botsConfigs } from '@/lib/configs';
import { Logger } from '@/lib/logger';

let xbot: XBotService | null = null;
let initializationPromise: Promise<void> | null = null;

async function initializeBot() {
    if (!xbot) {
        xbot = new XBotService(botsConfigs[0]);
        await xbot.initialize();
    }
}

export async function POST(req: NextRequest) {
    const token = req.headers.get('x-telegram-bot-api-secret-token');

    if (token !== process.env.TELEGRAM_SECRET_TOKEN) {
        Logger.warn('XAPI', 'Unauthorized access attempt', 'XBot', {
            receivedToken: token,
            expectedToken: process.env.TELEGRAM_SECRET_TOKEN ? '***' : 'undefined',
            body: req.body,
        });

        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Lazy initialization with singleton pattern
        if (!initializationPromise) {
            initializationPromise = initializeBot().catch((error) => {
                Logger.error('XAPI', 'Initialization failed:', 'XBot', error);
                initializationPromise = null;
                throw error;
            });
        }
        await initializationPromise;

        const body = await req.json();

        Logger.log('XAPI', 'Received update:', 'XBot', body);

        let res = null;

        if (xbot) {
            if (body.broadcast_triggers) {
                res = await xbot.handleBroadcastTriggers(body);
            } else if (body.bot_kill === 'SHUTDOWN') {
                await xbot.bot.closeWebHook();
            } else if (body.bot_kill === 'RESTART') {
                await xbot.bot.openWebHook();
            } else if (body.leave_group) {
                await xbot.bot.leaveChat(body.leave_group);
            } else {
                xbot.bot.processUpdate(body);
            }
        } else {
            Logger.error('XAPI', 'Bot not initialized before processing update', 'XBot');

            return NextResponse.json(
                { error: 'Bot initialization failed' },
                { status: 500 }
            );
        }

        return NextResponse.json({ status: 'ok', res: res });
    } catch (error) {
        Logger.error('XAPI', 'Error handling request:', 'XBot', error);

        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
