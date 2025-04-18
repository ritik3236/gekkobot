import { BulkPayoutVerifierInterface, TransactionInterface } from '@/lib/types';

import { ValidationService } from './validationService';

export class DemoBankExcelVerifier implements BulkPayoutVerifierInterface {
    validate(rows: any[][], expectedPayoutCount: number | null, expectedTotalAmount: number | null) {
        let transactionCount = 0;
        let totalAmount = 0;
        const errors: string[] = [];
        const transactions: TransactionInterface[] = [];

        // Skip header row
        rows.slice(1).forEach((row, index) => {
            const amount = parseFloat(row[2]);

            if (isNaN(amount)) {
                errors.push(`Invalid amount in row ${index + 2}`);

                return;
            }
            totalAmount += amount;
            transactionCount++;
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
