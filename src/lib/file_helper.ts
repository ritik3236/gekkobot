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
    type_2_msme: [
        'RECORD',
        'E-BANKING REF NO',
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

    if (fileTypeColumns.type_2_msme.every((column) => rows[0].includes(column))) {
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
            return getType2MsmeTransactions(rows, fileName);
        case 'type_3_yes_bank':
            return getType3YesBankTransactions(rows, fileName);
        case 'type_1_universal':
            return getType1UniversalTransactions(rows, fileName);
        default:
            break;
    }

}

//   # 1~SYAMALA D C~NEFT~32660100011140~140662.5~BARB0ROYAPU~9717473908~PAY~
//   # 0~    1     ~  2  ~          3   ~  4     ~     5     ~      6   ~ 7 ~
function getType2MsmeTransactions(rows: any[][], fileName: string) {
    const txns: Partial<Transaction>[] = [];

    console.log(rows);
    convertToKeyValue(rows, 0).forEach((row, index) => {
        const record = row['RECORD']?.split('~');
        const txid = row['E-BANKING REF NO'];

        const txn: Partial<Transaction> = {
            accountHolderName: record['1'],
            accountNumber: record['3'],
            amount: record[4],
            bankRefundUuid: '',
            fileName: fileName,
            ifscCode: record['5'],
            remark: '',
            sNo: index + 1,
            status: 'created',
            transferType: '',
            txnDate: null,
            utr: txid,
            uuid: '',
        };

        txns.push(validateTransaction(txn));
    });

    return txns;
}

function getType1UniversalTransactions(rows: any[][], fileName) {
    const txns: Partial<Transaction>[] = [];

    console.log(rows);
    convertToKeyValue(rows, 0).forEach((row, index) => {
        const amount = row['Amount']?.replaceAll(',', '');

        const txn: Partial<Transaction> = {
            accountHolderName: row['Account Holder Name'],
            accountNumber: row['Account Number'],
            amount: amount,
            bankRefundUuid: '',
            fileName: fileName,
            ifscCode: row['IFSC Code'],
            remark: '',
            sNo: index + 1,
            status: 'created',
            transferType: '',
            txnDate: formatDate(row['Transaction Date']),
            utr: String(row['UTR']),
            uuid: row['TID'],
        };

        txns.push(validateTransaction(txn));
    });

    return txns;
}

function getType1CnbTransaction(rows: any[][], fileName) {
    const txns: Partial<Transaction>[] = [];

    console.log(rows);
    convertToKeyValue(rows, 5).forEach((row, index) => {
        const txn: Partial<Transaction> = {
            accountHolderName: row['Beneficiary Name'],
            accountNumber: row['Beneficiary Account Number'],
            amount: row['Amount'],
            bankRefundUuid: '',
            fileName: fileName,
            ifscCode: row['Benficiary Bank IFSC'],
            remark: '',
            sNo: index + 1,
            status: 'created',
            transferType: '',
            txnDate: formatDate(row['Value Date']),
            utr: String(row['RBI/UTR Reference Number']),
            uuid: row['Customer Reference Number'],
        };

        txns.push(validateTransaction(txn));
    });

    return txns;
}

function getType3YesBankTransactions(rows: any[][], fileName) {
    let sNo = 0;
    const txns: Partial<Transaction>[] = [];

    console.log(rows);

    rows.forEach((row) => {
        if (row[0] !== 'D') return;

        sNo++;
        const txn: Partial<Transaction> = {
            accountHolderName: row[9],
            accountNumber: row[8],
            amount: row[16],
            bankRefundUuid: '',
            fileName: fileName,
            ifscCode: row[7],
            remark: '',
            sNo: sNo,
            status: 'created',
            transferType: '',
            txnDate: formatDate(row[15]),
            utr: String(row[18]),
            uuid: row[14],
        };

        txns.push(validateTransaction(txn));
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

function validateTransaction(txn: Partial<Transaction>): Partial<Transaction> {
    const errors = [];

    console.log(txn);

    if (!isNumeric(txn.amount)) {
        errors.push('invalid amount');
    }
    if (!txn.accountHolderName || txn.accountHolderName.length < 2) {
        errors.push('invalid account holder name');
    }
    if (!txn.accountNumber || txn.accountNumber?.length < 2) {
        errors.push('invalid account number');
    }
    if (!txn.ifscCode || txn.ifscCode?.length < 2) {
        errors.push('invalid ifsc_code');
    }
    if (!txn.utr || txn.utr == 'undefined' || txn.utr.length < 5) {
        errors.push('invalid utr');
    }
    if (errors.length) {
        return { ...txn, status: 'invalid', remark: JSON.stringify(errors) };
    } else {
        return txn;
    }
}

function formatDate(date: string) {
    const formats = ['d/M/yyyy', 'd/M/yy', 'dd/MM/yyyy', 'dd/MM/yy'];

    for (const fmt of formats) {
        const dt = luxon.fromFormat(date, fmt);

        if (dt.isValid) return dt.toJSDate();
    }

    return null;
}
