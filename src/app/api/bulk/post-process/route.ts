import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

import { VerifierFactory } from '@/lib/bulk';
import { setCorsHeaders } from '@/lib/middleware';
import { BulkPayoutResponse } from '@/lib/types';

export async function POST(req: Request) {
    try {
        const { file_url, data }: BulkPayoutResponse = await req.json();

        if (!file_url || !data) {
            return NextResponse.json(
                { error: 'Missing file_url or data' },
                { status: 400 }
            );
        }

        // Fetch and parse Excel file
        const res = await fetch(file_url);

        if (!res.ok) throw new Error('Failed to fetch Excel file');

        const arrayBuffer = await res.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Validate using appropriate verifier
        const verifier = VerifierFactory.createVerifier(data.file_format);

        const result = verifier.validate(rows, data.payout_count, data.total_amount);

        return setCorsHeaders(NextResponse.json({
            isValid: result.isValid,
            transactionCount: result.transactionCount,
            totalAmount: result.totalAmount,
            errors: result.errors,
        }, {
            status: result.isValid ? 200 : 400,
        }));

    } catch (error) {
        console.error('Validation error:', error);

        return setCorsHeaders(NextResponse.json(
            { error: error instanceof Error ? error.message : 'Validation failed' },
            { status: 500 }
        ));
    }
}

export async function OPTIONS(): Promise<Response> {
    return setCorsHeaders(new NextResponse(null, { status: 204 }));
}
