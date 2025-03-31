import { NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';

interface OCRRequest {
    imagePath: string;
}

interface OCRFields {
    uniqueId: string;
    date?: string;
    name?: string;
    amount?: string;
    refundUtr?: string;
}

export async function POST(req: Request): Promise<NextResponse> {
    const worker = await createWorker('eng');

    try {
        const { imagePath }: OCRRequest = await req.json();

        await worker.load();
        const { data: { text } } = await worker.recognize(imagePath);

        await worker.terminate();

        const fields: OCRFields = {
            uniqueId: text.match(/UTR:\s*(\w+)/i)?.[1] || `REF${Date.now()}`,
            date: text.match(/Date:\s*(\d{2}[-/]\d{2}[-/]\d{4})/i)?.[1],
            name: text.match(/Name:\s*([A-Za-z\s]+)/i)?.[1],
            amount: text.match(/Amount:\s*₹?(\d+(?:\.\d+)?)/i)?.[1],
            refundUtr: text.match(/UTR:\s*(\w+)/i)?.[1],
        };

        return NextResponse.json({ ocrText: text, fields });
    } catch (error) {
        console.error(error);

        return NextResponse.json({ error: 'OCR processing failed' }, { status: 500 });
    }
}
