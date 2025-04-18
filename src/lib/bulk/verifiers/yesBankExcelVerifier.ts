import { BulkPayoutVerifierInterface, TransactionInterface } from '@/lib/types';

import { ValidationService } from './validationService';

export class YesBankExcelVerifier implements BulkPayoutVerifierInterface {
    validate(rows: any[][], expectedPayoutCount: number | null, expectedTotalAmount: number | null) {

        let transactionCount = 0;
        let totalAmount = 0;
        const errors: string[] = [];
        const transactions: TransactionInterface[] = [];

        rows.forEach((row, index) => {
            if (row[0] === 'D') { // Data row indicator
                const amount = parseFloat(row[16]);

                // Create transaction object
                const transaction: TransactionInterface = {
                    accountHolderName: row[9],
                    accountNumber: row[8],
                    amount: amount,
                    createdAt: row[15],
                    fileName: '',
                    ifscCode: row[7],
                    sNo: index + 3,
                    tid: row[14],
                };

                if (isNaN(amount)) {
                    const errorMsg = `Invalid amount in row ${index + 3} | Tid: ${row[14]}`;

                    errors.push(errorMsg);
                    transactions.push({ ...transaction });

                    return;
                }

                totalAmount += amount;
                transactionCount++;
                transactions.push({ ...transaction });
            }
        });

        const validationResult = ValidationService.validateResults(
            transactionCount,
            totalAmount,
            expectedPayoutCount,
            expectedTotalAmount,
            errors
        );

        return { ...validationResult, transactions };
    }
}
