export class ValidationService {
    static validateResults(
        transactionCount: number,
        totalAmount: number,
        expectedPayoutCount: number | null,
        expectedTotalAmount: number | null,
        existingErrors: string[] = []
    ) {
        const errors = [...existingErrors];

        const isTransactionCountValid = expectedPayoutCount === null || transactionCount === expectedPayoutCount;
        const isTotalAmountValid = expectedTotalAmount === null || Math.abs(totalAmount - expectedTotalAmount) < 0.01;

        if (!isTransactionCountValid) {
            errors.push(`Transaction count mismatch: Expected ${expectedPayoutCount}, found ${transactionCount}`);
        }

        if (!isTotalAmountValid) {
            errors.push(`Total amount mismatch: Expected ${expectedTotalAmount}, found ${totalAmount.toFixed(2)}`);
        }

        return {
            errors,
            isTotalAmountValid,
            isTransactionCountValid,
            totalAmount,
            transactionCount,
        };
    }
}
