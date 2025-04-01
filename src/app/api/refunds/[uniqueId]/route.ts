// app/api/refunds/[eid]/route.ts
import { NextResponse } from 'next/server';

import { dbInstance } from '@/lib/db/client';

export async function GET(request: Request, segmentData) {
    try {
        const params = await segmentData.params;

        const eid = params.eid;

        if (!eid) {
            return NextResponse.json(
                { error: 'Missing eid parameter' },
                { status: 400 }
            );
        }

        const refund = await dbInstance.getRefundById(eid);

        if (!refund) {
            return NextResponse.json(
                { error: `Refund with eid ${eid} not found` },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, data: refund },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error in GET /api/refunds/[eid]:', error);

        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
