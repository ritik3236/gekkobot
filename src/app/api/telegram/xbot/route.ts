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

        if (xbot) {
            if (body.broadcoast_triggers) {
                await xbot.handleCustomTriggers(body.broadcoast_triggers);
            } else if (body.bot_kill === true) {
                await xbot.bot.closeWebHook();
            } else if (body.leave_groups) {
                for (const groupId of body.leave_groups) {
                    await xbot.bot.leaveChat(groupId);
                }
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

        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        Logger.error('XAPI', 'Error handling request:', 'XBot', error);

        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
