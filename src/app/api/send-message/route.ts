import fs from 'fs/promises';

import axios from 'axios';
import FormData from 'form-data';
import { NextResponse } from 'next/server';

const TELEGRAM_API: string = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

interface MessageRequest {
    chatId: number;
    text: string;
    imagePath?: string;
}

export async function POST(req: Request): Promise<NextResponse> {
    try {
        const { chatId, text, imagePath }: MessageRequest = await req.json();

        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text });

        if (imagePath) {
            const formData = new FormData();

            formData.append('chat_id', chatId.toString());
            formData.append('photo', await fs.readFile(imagePath));
            await axios.post(`${TELEGRAM_API}/sendPhoto`, formData, {
                headers: formData.getHeaders(),
            });
            await fs.unlink(imagePath);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);

        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}
