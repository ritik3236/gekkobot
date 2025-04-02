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

        const transactions = await dbInstance.getTransactionByNameAndAmount(name, amount);

        if (!transactions?.length) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 200 });
        }

        if (transactions.length > 1) {
            return NextResponse.json({ error: 'Multiple transactions found', data: transactions }, { status: 200 });
        }

        const updatedTransaction = await dbInstance.updateTransaction({ id: transactions[0]!.id, status: 'refunded' });

        return NextResponse.json({ success: true, data: updatedTransaction });
    } catch (error) {
        console.error(error);

        return NextResponse.json({ error: error.message || 'Transaction update failed' }, { status: 500 });
    }
}
