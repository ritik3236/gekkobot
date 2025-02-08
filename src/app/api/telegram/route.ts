import { NextRequest, NextResponse } from 'next/server';

import { initializeBots } from '@/bots';
import { botsConfig } from '@/lib/configs';

// Ensure bots are initialized when server starts
initializeBots(botsConfig);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        console.log('Received update:', body);

        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error('Error handling Telegram update:', error);

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
