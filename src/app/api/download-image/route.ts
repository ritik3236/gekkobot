import fs from 'fs';

import axios from 'axios';
import { NextResponse } from 'next/server';

const TELEGRAM_API: string = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

interface DownloadRequest {
    fileId: string;
}

export async function POST(req: Request): Promise<NextResponse> {
    try {
        const { fileId }: DownloadRequest = await req.json();
        const fileUrl: string = await getFileUrl(fileId);
        const imagePath: string = await downloadImage(fileUrl);

        return NextResponse.json({ imagePath });
    } catch (error) {
        console.error(error);

        return NextResponse.json({ error: 'Failed to download image' }, { status: 500 });
    }
}

async function getFileUrl(fileId: string): Promise<string> {
    const response = await axios.get<{ result: { file_path: string } }>(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
    const filePath: string = response.data.result.file_path;

    return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
}

async function downloadImage(url: string): Promise<string> {
    const response = await axios({ url, responseType: 'stream' });
    const imagePath: string = `/tmp/${Date.now()}.jpg`;

    response.data.pipe(fs.createWriteStream(imagePath));

    return new Promise((resolve) => response.data.on('end', () => resolve(imagePath)));
}
