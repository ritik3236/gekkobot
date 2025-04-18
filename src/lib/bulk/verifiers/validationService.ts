export class ValidationService {
    static validateResults(
        transactionCount: number,
        totalAmount: number,
        expectedPayoutCount: number | null,
        expectedTotalAmount: number | null,
        existingErrors: string[] = []
    ) {
        const errors = [...existingErrors];

        if (expectedPayoutCount !== null && transactionCount !== expectedPayoutCount) {
            errors.push(`Transaction count mismatch: Expected ${expectedPayoutCount}, found ${transactionCount}`);
        }

        if (expectedTotalAmount !== null && Math.abs(totalAmount - expectedTotalAmount) > 0.01) {
            errors.push(`Total amount mismatch: Expected ${expectedTotalAmount}, found ${totalAmount.toFixed(2)}`);
        }

        return {
            errors,
            isValid: errors.length === 0,
            totalAmount,
            transactionCount,
        };
    }
}
