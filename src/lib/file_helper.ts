import * as XLSX from 'xlsx';

import { Transaction } from '@/lib/db/schema';
import { luxon } from '@/lib/localeDate';
import { isNumeric } from '@/lib/numberHelper';

export async function processExcelFile(fileUrl: string) {
    const response = await fetch(fileUrl);

    if (!response.ok) throw new Error('Failed to download file');

    const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const transactions = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, raw: false });

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
    type_2_cnb: [
        'Record No',
        'Payment Type',
        'Value Date',
        'Amount',
        'Beneficiary Name',
        'Beneficiary Account Number',
        'Benficiary Bank IFSC',
        'Currency',
        'RBI/UTR Reference Number',
        'Debit Account Number',
        'Customer Reference Number',
        'Transaction Reference',
        'Instrument Number',
        'Remitter Name - Sub Member',
        'Additional Buffer Field - Sub Member',
        'Status',
        'Error Description',
    ],
    type_3_cnb: [
        'Record No',
        'Value Date',
        'Payment Type',
        'Transaction Reference',
        'Debit Account Number',
        'Beneficiary Name',
        'Beneficiary Account Number',
        'Benficiary Bank IFSC',
        'Amount',
        'Currency',
        'RBI/UTR Reference Number',
        'Status',
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
    const tags = new Set(rows.map((row) => row[0]));

    if (rows[0]?.length === fileTypeColumns.type_2_msme.length && rows[0].every((column) => fileTypeColumns.type_2_msme.includes(column))) {
        return 'type_2_msme';
    } else if (rows[5]?.length === fileTypeColumns.type_1_cnb.length && rows[5].every((column) => fileTypeColumns.type_1_cnb.includes(column))) {
        return 'type_1_cnb';
    } else if (rows[5]?.length === fileTypeColumns.type_2_cnb.length && rows[5].every((column) => fileTypeColumns.type_2_cnb.includes(column))) {
        return 'type_2_cnb';
    } else if (rows[5]?.length === fileTypeColumns.type_3_cnb.length && rows[5].every((column) => fileTypeColumns.type_3_cnb.includes(column))) {
        return 'type_3_cnb';
    } else if (tags.has('H') && tags.has('F')) {
        return 'type_3_yes_bank';
    } else {
        return 'unknown';
    }
}

export function getTransactionsFromFile(rows: any[][], fileName: string) {
    const fileType = getFileDataType(rows);

    switch (fileType) {
        case 'type_1_cnb':
            return getType1CnbTransactions(rows, fileName);
        case 'type_2_cnb':
            return getType2CnbTransactions(rows, fileName);
        case 'type_3_cnb':
            return getType3CnbTransactions(rows, fileName);
        case 'type_2_msme':
            return;
        case 'type_3_yes_bank':
            return getType3YesBankTransactions(rows, fileName);
        default:
            return;
    }
}

function getType1CnbTransactions(rows: any[][], fileName: string) {
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

function getType2CnbTransactions(rows: any[][], fileName: string) {
    const txns: Partial<Transaction>[] = [];

    rows.forEach((row) => {
        if (!isNumeric(3) || !isNumeric(row[0])) return;

        const txn: Partial<Transaction> = {
            accountHolderName: row[4],
            accountNumber: row[5],
            amount: row[3],
            ifscCode: row[6],
            utr: row[8],
            sNo: +row[0],
            transferType: '',
            txnDate: luxon.fromFormat(row[2], 'dd/MM/yyyy').toJSDate(),
            status: 'created',
            remark: row[15],
            uuid: row[10],
            bankRefundUuid: '',
            fileName: fileName,
        };

        txns.push(txn);

        console.log('txn', txn);
    });

    return txns;
}

function getType3CnbTransactions(rows: any[][], fileName: string) {
    const txns: Partial<Transaction>[] = [];

    rows.forEach((row) => {
        if (!isNumeric(3) || !isNumeric(row[0])) return;

        const txn: Partial<Transaction> = {
            accountHolderName: row[5],
            accountNumber: row[6],
            ifscCode: row[7],
            amount: row[8],
            utr: row[10],
            sNo: +row[0],
            transferType: '',
            txnDate: luxon.fromFormat(row[1], 'dd/MM/yyyy').toJSDate(),
            status: 'created',
            remark: row[11],
            uuid: row[3],
            bankRefundUuid: '',
            fileName: fileName,
        };

        txns.push(txn);

        console.log('txn', txn);
    });

    return txns;
}

function getType3YesBankTransactions(rows: any[][], fileName) {
    const txns: Partial<Transaction>[] = [];

    rows.forEach((row, index) => {
        if (row[0] !== 'D' || !isNumeric(row[16]) || row[18]?.length < 5) return;

        const txn: Partial<Transaction> = {
            accountHolderName: row[9],
            accountNumber: row[8],
            amount: row[16],
            ifscCode: row[7],
            utr: String(row[18]),
            sNo: index,
            transferType: '',
            txnDate: luxon.fromFormat(row[15], 'dd/MM/yyyy').toJSDate(),
            status: 'created',
            remark: '',
            uuid: row[14],
            bankRefundUuid: '',
            fileName: fileName,
        };

        txns.push(txn);

        console.log('txn', txn);
    });

    return txns;
}
