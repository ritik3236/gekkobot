import axios from 'axios';
import { NextResponse } from 'next/server';

const BASE_URL: string = process.env.VERCEL_URL || 'http://localhost:3000';

interface TelegramUpdate {
    message?: {
        chat?: { id: number };
        photo?: { file_id: string }[];
    };
}

export async function POST(req: Request): Promise<NextResponse> {
    try {
        const update: TelegramUpdate = await req.json();
        const chatId: number | undefined = update?.message?.chat?.id;
        const photo: { file_id: string }[] | undefined = update?.message?.photo;

        if (!photo) {
            await axios.post(`${BASE_URL}/api/send-message`, { chatId, text: 'Please send an image.' });

            return NextResponse.json({ success: true });
        }

        const fileId: string = photo[photo.length - 1].file_id;

        const { data: { imagePath } } = await axios.post<{
            imagePath: string
        }>(`${BASE_URL}/api/download-image`, { fileId });
        const { data: { ocrText, fields } } = await axios.post<{
            ocrText: string;
            fields: Record<string, string | undefined>
        }>(`${BASE_URL}/api/process-ocr`, { imagePath });

        await axios.post(`${BASE_URL}/api/record-refund`, { ocrText, ...fields });
        const { data: { transactionDetails } } = await axios.post<{
            transactionDetails: string
        }>(`${BASE_URL}/api/detect-transaction`, { ocrText });

        await axios.post(`${BASE_URL}/api/send-message`, {
            chatId,
            text: transactionDetails || 'No transaction detected.',
            imagePath,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        const update: TelegramUpdate = await req.json();
        const chatId: number | undefined = update?.message?.chat?.id;

        if (chatId) await axios.post(`${BASE_URL}/api/send-message`, { chatId, text: 'Error processing image.' });

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
