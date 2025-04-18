import { dbInstance } from '@/lib/db/client';

interface VerificationResult {
    isTransactionValid: boolean;
    isFileValid: boolean;
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

    async validate(): Promise<VerificationResult> {
        const errors: string[] = [];
        let fileNameExists: boolean;
        const duplicateTransactions: Array<{ tid: string; amount: number }> = [];

        // Check if filename exists in file_summaries
        fileNameExists = await dbInstance.checkFileNameExists(this.fileName);

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
            isFileValid: !fileNameExists,
            isTransactionValid: duplicateTransactions.length === 0,
            errors,
            duplicateTransactions,
        };
    }
}
