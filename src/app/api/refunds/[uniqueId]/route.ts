// app/api/refunds/[uniqueId]/route.ts
import { NextResponse } from 'next/server';

import { dbInstance } from '@/lib/db/client';

export async function GET(request: Request, segmentData) {
    try {
        const params = await segmentData.params;

        const uniqueId = params.uniqueId;

        if (!uniqueId) {
            return NextResponse.json(
                { error: 'Missing uniqueId parameter' },
                { status: 400 }
            );
        }

        const refund = await dbInstance.getRefundById(uniqueId);

        if (!refund) {
            return NextResponse.json(
                { error: `Refund with uniqueId ${uniqueId} not found` },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, data: refund },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error in GET /api/refunds/[uniqueId]:', error);

        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
