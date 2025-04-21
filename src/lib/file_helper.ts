import * as XLSX from 'xlsx';

import { Transaction } from '@/lib/db/schema';
import { luxon } from '@/lib/localeDate';
import { isNumeric } from '@/lib/numberHelper';

export async function processExcelFile(fileUrl: string) {
    const response = await fetch(fileUrl);

    if (!response.ok) throw new Error('Failed to download file');

    const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const transactions = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });

    return { transactions };
}

const fileTypeColumns = {
    type_1_cnb: [
        'Record No',
        'Payment Type',
        'Value Date',
        'Beneficiary Name',
        'Amount',
        'Currency',
        'Benficiary Bank IFSC',
        'Beneficiary Account Number',
        'RBI/UTR Reference Number',
        'Debit Account Number',
        'Customer Reference Number',
        'Transaction Reference',
        'Instrument Number',
        'Remarks',
        'Status',
        'Error Description',
    ],
    type_2_msme: [
        'RECORD',
        'RECORD REF NO',
        'FILE REF NO',
        'E-BANKING REF NO',
        'CONTRACT REF NO',
        'RECORD STATUS',
        'STATUS CODE',
        'STATUS DESCRIPTION',
    ],
};

export function getFileDataType(rows: any[][]) {
    if (rows[0]?.length === fileTypeColumns.type_2_msme.length && rows[0].every((column) => fileTypeColumns.type_2_msme.includes(column))) {
        return 'type_2_msme';
    } else if (rows[5]?.length === fileTypeColumns.type_1_cnb.length && rows[5].every((column) => fileTypeColumns.type_1_cnb.includes(column))) {
        return 'type_1_cnb';
    } else {
        return 'unknown';
    }
}

export function getTransactionsFromFile(rows: any[][], fileName: string) {
    const fileType = getFileDataType(rows);

    console.log('fileType', fileType);

    switch (fileType) {
        case 'type_1_cnb':
            return getType1CnbTransactions(rows, fileName);
        case 'type_2_msme':
            return;
        default:
            return;
    }
}

function getType1CnbTransactions(rows: any[][], fileName) {
    const txns: Partial<Transaction>[] = [];

    rows.forEach((row) => {
        if (!isNumeric(row[4]) || !isNumeric(row[0])) return;

        const txn: Partial<Transaction> = {
            accountHolderName: row[3],
            accountNumber: row[7],
            amount: row[4],
            ifscCode: row[6],
            utr: row[8],
            sNo: +row[0],
            transferType: '',
            txnDate: luxon.fromFormat(row[2], 'dd/MM/yyyy').toJSDate(),
            status: 'created',
            remark: row[13] + row[14],
            uuid: row[10],
            bankRefundUuid: '',
            fileName: fileName,
        };

        txns.push(txn);

        console.log('txn', txn);
    });

    return txns;
}
