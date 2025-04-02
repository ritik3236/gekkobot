// app/api/transactions/[id]/route.ts
import { NextResponse } from 'next/server';

import { dbInstance } from '@/lib/db/client';

export async function GET(request: Request, segmentData: { params: any; }) {
    try {
        const params = await segmentData.params;

        const id = params.id;

        if (!id) {
            return NextResponse.json(
                { error: 'Missing id parameter' },
                { status: 400 }
            );
        }

        const transaction = await dbInstance.getTransactionById(id);

        if (!transaction) {
            return NextResponse.json(
                { error: `transaction with id ${id} not found` },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { success: true, data: transaction },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error in GET /api/transactions/[id]:', error);

        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
