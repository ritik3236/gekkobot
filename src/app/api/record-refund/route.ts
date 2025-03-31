import { NextResponse } from 'next/server';

import { recordRefund } from '@/lib/db/client';

interface RefundRequest {
    ocrText: string;
    uniqueId: string;
    date?: string;
    name?: string;
    amount?: string;
    refundUtr?: string;
}

export async function POST(req: Request): Promise<NextResponse> {
    try {
        const { ocrText, uniqueId, date, name, amount, refundUtr }: RefundRequest = await req.json();

        await recordRefund({ uniqueId, ocrText, date, name, amount, refundUtr });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);

        return NextResponse.json({ error: 'Failed to record refund' }, { status: 500 });
    }
}
