import { NextResponse } from 'next/server';

import { OCRBot } from '@/lib/telegram/bot-instances';

interface MessageRequest {
    chatId: number;
    text: string;
    imagePath?: string;
}

export async function POST(req: Request): Promise<NextResponse> {
    try {
        const { chatId, text, imagePath }: MessageRequest = await req.json();

        console.log('Sending message to chatId:', chatId, 'Text:', text, 'Image path:', imagePath);

        await OCRBot.sendMessage(chatId, text);

        if (imagePath) {
            await OCRBot.sendPhoto(chatId, imagePath);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);

        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}
