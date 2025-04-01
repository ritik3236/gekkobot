import { NextResponse } from 'next/server';

import { dbInstance } from '@/lib/db/client';

interface RequestTransaction {
    refund_uuid: string;
}

export async function POST(req: Request): Promise<NextResponse> {
    try {
        const { refund_uuid }: RequestTransaction = await req.json();

        if (!refund_uuid) {
            return NextResponse.json({ error: 'Invalid refund_uuid id' }, { status: 200 });
        }

        const { name, amount } = await dbInstance.getRefundByEid(refund_uuid);

        console.log('Transaction name:', name, 'Amount:', amount);
        const transaction = await dbInstance.getTransactionByNameAndAmount('Ritik', '309779.09');

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 200 });
        }

        const updatedTransaction = await dbInstance.updateTransaction({ id: transaction!.id, status: 'refunded' });

        return NextResponse.json({ success: true, data: updatedTransaction });
    } catch (error) {
        console.error(error);

        return NextResponse.json({ error: error.message || 'Transaction update failed' }, { status: 500 });
    }
}
