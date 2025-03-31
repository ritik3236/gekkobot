import { NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';

import { extractOcrFields } from '@/lib/ocr/extractors';

interface OCRRequest {
    imagePath: string;
}

export async function POST(req: Request): Promise<NextResponse> {
    const worker = await createWorker('eng');

    try {
        const { imagePath }: OCRRequest = await req.json();

        await worker.load();
        const { data: { text } } = await worker.recognize(imagePath);

        await worker.terminate();
        const fields = extractOcrFields(text);

        console.log(fields, '=========');

        return NextResponse.json({ ocrText: text, fields });
    } catch (error) {
        console.error(error);

        return NextResponse.json({ error: 'OCR processing failed' }, { status: 500 });
    }
}
