import { NextResponse } from 'next/server';

import prisma from '@/lib/db/client';
import { processRefund } from '@/lib/ocr/processor';
import { TelegramBotService } from '@/lib/telegram/bot';

interface ProcessRequest {
    fileId: string
    chatId: number
    messageId: number
}

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const { fileId, chatId, messageId } = await request.json() as ProcessRequest;

        const refundData = await processRefund(fileId);

        const record = await prisma.bankRefund.create({
            data: {
                ...refundData,
                chatId: chatId.toString(),
                fileId,
            },
        });

        await TelegramBotService.sendResultMessage(chatId, messageId, record);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Processing error:', error);

        return NextResponse.json(
            { error: 'Processing failed' },
            { status: 500 }
        );
    }
}
