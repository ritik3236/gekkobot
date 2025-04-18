import { dbInstance } from '@/lib/db/client';

interface VerificationResult {
    isValid: boolean;
    errors: string[];
    duplicateTransactions: Array<{ tid: string; amount: number }>;
}

export class DatabaseVerifier {
    private readonly fileName: string;
    private readonly transactions: Array<{ tid: string; amount: number }>;

    constructor(fileName: string, transactions: Array<{ tid: string; amount: number }>) {
        this.fileName = fileName;
        this.transactions = transactions;
    }

    async verify(): Promise<VerificationResult> {
        const errors: string[] = [];
        const duplicateTransactions: Array<{ tid: string; amount: number }> = [];

        // Check if filename exists in file_summaries
        const fileNameExists = await dbInstance.checkFileNameExists(this.fileName);

        if (fileNameExists) {
            errors.push(`File name '${this.fileName}' already exists in the system`);
        }

        // Check for duplicate transactions in bank_transactions
        const transactionChecks = this.transactions.map(async (tx) => {
            const exists = await dbInstance.checkTransactionExists(tx.tid, tx.amount);

            if (exists) {
                duplicateTransactions.push(tx);
                errors.push(`Duplicate transaction found: TID ${tx.tid} with amount ${tx.amount}`);
            }
        });

        await Promise.all(transactionChecks);

        return {
            isValid: errors.length === 0,
            errors,
            duplicateTransactions,
        };
    }
}

// Add this to
