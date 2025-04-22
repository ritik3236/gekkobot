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
    type_4_cnb: [
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
        'Remarks',
        'Transaction Reference',
        'Instrument Number',
        'Remitter Name - Sub Member',
        'Additional Buffer Field - Sub Member',
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

    type_1_universal: [
        'Account Holder Name',
        'Amount',
        'Account Number',
        'IFSC Code',
        'UTR',
        'Transaction Date',
        'TID',
    ],
};

export function getFileDataType(rows: any[][]) {
    const tags = new Set(rows.map((row) => row[0]));

    if (rows[0]?.length === fileTypeColumns.type_2_msme.length && rows[0].every((column) => fileTypeColumns.type_2_msme.includes(column))) {
        return 'type_2_msme';
    } else if (rows[4]?.length === 0 && rows[0]?.[0] === 'File Transactions') {
        return 'type_1_cnb';
    } else if (tags.has('H') && tags.has('F')) {
        return 'type_3_yes_bank';
    } else if (rows[0].every((column) => fileTypeColumns.type_1_universal.includes(column))) {
        return 'type_1_universal';
    } else {
        return 'unknown';
    }
}

export function getTransactionsFromFile(rows: any[][], fileName: string) {
    const fileType = getFileDataType(rows);

    console.log(fileType);

    switch (fileType) {
        case 'type_1_cnb':
            return getType1CnbTransaction(rows, fileName);
        case 'type_2_msme':
            return;
        case 'type_3_yes_bank':
            return getType3YesBankTransactions(rows, fileName);
        case 'type_1_universal':
            return getType1UniversalTransactions(rows, fileName);
        default:
            return;
    }
}

function getType1UniversalTransactions(rows: any[][], fileName) {
    const txns: Partial<Transaction>[] = [];

    console.log(rows);

    const convertedRows = convertToKeyValue(rows, 0);

    convertedRows.forEach((row, index) => {

        const amount = row['Amount']?.replaceAll(',', '');

        if (!isNumeric(amount) || row['UTR']?.length < 5) return;

        const txn: Partial<Transaction> = {
            accountHolderName: row['Account Holder Name'],
            accountNumber: row['Account Number'],
            amount: amount,
            ifscCode: row['IFSC Code'],
            utr: String(row['UTR']),
            sNo: index + 1,
            transferType: '',
            txnDate: luxon.fromFormat(row['Transaction Date'], 'dd/MM/yyyy').toJSDate(),
            status: 'created',
            remark: '',
            uuid: row['TID'],
            bankRefundUuid: '',
            fileName: fileName,
        };

        txns.push(txn);

        console.log('txn', txn);
    });

    return txns;
}

function getType1CnbTransaction(rows: any[][], fileName) {
    const txns: Partial<Transaction>[] = [];
    const convertedRows = convertToKeyValue(rows, 5);

    console.log(rows);
    
    convertedRows.forEach((row, index) => {
        if (!isNumeric(row['Amount']) || row['RBI/UTR Reference Number']?.length < 5) return;

        const txn: Partial<Transaction> = {
            accountHolderName: row['Beneficiary Name'],
            accountNumber: row['Beneficiary Account Number'],
            amount: row['Amount'],
            ifscCode: row['Benficiary Bank IFSC'],
            utr: String(row['RBI/UTR Reference Number']),
            sNo: index + 1,
            transferType: '',
            txnDate: luxon.fromFormat(row['Value Date'], 'dd/MM/yyyy').toJSDate(),
            status: 'created',
            remark: '',
            uuid: row['Customer Reference Number'],
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

    console.log(rows);

    rows.forEach((row, index) => {
        if (row[0] !== 'D' || !isNumeric(row[16]) || row[18]?.length < 5) return;

        const txn: Partial<Transaction> = {
            accountHolderName: row[9],
            accountNumber: row[8],
            amount: row[16],
            ifscCode: row[7],
            utr: String(row[18]),
            sNo: index + 1,
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

function convertToKeyValue(rows: string[][], headerRowIndex: number): Record<string, string>[] {
    if (rows.length <= headerRowIndex) {
        throw new Error('Insufficient rows to extract headers.');
    }

    const headers = rows[headerRowIndex];
    const dataRows = rows.slice(headerRowIndex + 1);

    return dataRows.map((row) => {
        const record: Record<string, string> = {};

        headers.forEach((key, index) => {
            record[key.trim()] = row[index]?.trim() ?? '';
        });

        return record;
    });
}
