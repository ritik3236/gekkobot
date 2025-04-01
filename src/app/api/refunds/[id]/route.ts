// app/api/refunds/[id]/route.ts
import { NextResponse } from 'next/server';

import { dbInstance } from '@/lib/db/client';

export async function GET(request: Request, segmentData) {
    try {
        const params = await segmentData.params;

        const id = params.id;

        if (!id) {
            return NextResponse.json(
                { error: 'Missing id parameter' },
                { status: 400 }
            );
        }

        const refund = await dbInstance.getRefundById(id);

        if (!refund) {
            return NextResponse.json(
                { error: `Refund with id ${id} not found` },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, data: refund },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error in GET /api/refunds/[id]:', error);

        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
