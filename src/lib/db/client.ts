import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql, { Connection } from 'mysql2/promise';

import { prepareTransactionQuery } from '@/lib/db/helper';
import * as schema from '@/lib/db/schema';
import { isNumeric } from '@/lib/numberHelper';
import { FileSummaryCreateData, TransactionCreateInterface } from '@/lib/types';

interface DbConfig {
    host: string;
    user: string;
    password: string;
    database: string;
}

interface RefundData {
    uuid: string;
    ocrText: string;
    txnDate: string | null;
    name: string | null;
    amount: string | null;
    fileUrl: string | null;
    refundUtr: string | null;
}

interface TransactionUpdateData {
    id: number;
    status: string;
    bankRefundUuid: string;
}

interface RefundUpdatePayload extends Partial<schema.Transaction> {
    id: number;
    transactionUuid: string;
}

export class Database {
    private readonly dbConfig: DbConfig;
    private connection: Connection | null = null;
    private db: ReturnType<typeof drizzle> | null = null;

    constructor() {
        this.dbConfig = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        };
    }

    public async initialize(): Promise<void> {
        if (!this.connection) {
            this.connection = await mysql.createConnection(this.dbConfig);
            console.log('Database connection established');
        }
        if (!this.db) {
            this.db = drizzle(this.connection, { schema, mode: 'default' });
            console.log('Drizzle ORM initialized');
        }
    }

    private async getDb(): Promise<ReturnType<typeof drizzle>> {
        if (!this.db) {
            await this.initialize();
        }

        return this.db!;
    }

    // --- Bank_Refunds Methods ---

    async recordRefund(payload: RefundData): Promise<schema.BankRefund> {
        console.log('Recording refund:', payload);

        try {
            const db = await this.getDb();
            const [res] = await db.insert(schema.bankRefunds).values(payload);

            console.log('Refund recorded:', { id: res.insertId });

            return await this.getRefundById(res.insertId);
        } catch (error) {
            console.error('Error recording refund:', error);
            throw error;
        }
    }

    async getRefundById(id: number | string): Promise<schema.BankRefund | undefined> {
        try {
            const db = await this.getDb();
            const query = db
                .select()
                .from(schema.bankRefunds)
                .where(eq(isNumeric(id) ? schema.bankRefunds.id : schema.bankRefunds.uuid, id));

            console.log('Generated SQL - [getRefundById]: ', query.toSQL());

            const result = await query;

            return result[0];
        } catch (error) {
            console.error('Error retrieving refund:', error);
            throw error;
        }
    }

    async updateRefund(payload: RefundUpdatePayload): Promise<schema.BankRefund | undefined> {
        const db = await this.getDb();

        return await db.transaction(async (tx) => {
            try {
                const query = tx
                    .update(schema.bankRefunds)
                    .set({
                        transactionUuid: payload.transactionUuid,
                        fileName: payload.fileName,
                        sNo: payload.sNo,
                    } as Partial<schema.BankRefund>)
                    .where(eq(schema.bankRefunds.id, payload.id));

                console.log('Generated SQL - [updateRefund]: ', query.toSQL());

                await query;

                return await this.getRefundById(payload.id);
            } catch (error) {
                console.error('Error updating refund:', error);
                throw error;
            }
        });
    }

    // --- Transactions Methods ---
    async recordTransaction(payload: TransactionCreateInterface): Promise<schema.Transaction> {
        console.log('Recording transaction:', payload);

        try {
            const db = await this.getDb();
            const [res] = await db.insert(schema.transactions).values(payload);

            console.log('Transaction recorded:', { id: res.insertId });

            return await this.getTransactionById(res.insertId);
        } catch (error) {
            console.error('Error recording transaction:', error);
            throw error;
        }
    }

    async getTransactionById(id: number | string): Promise<schema.Transaction | undefined> {
        try {
            const db = await this.getDb();
            const query = db
                .select()
                .from(schema.transactions)
                .where(eq(isNumeric(id) ? schema.transactions.id : schema.transactions.uuid, id));

            console.log('Generated SQL - [getTransactionById]: ', query.toSQL());

            const result = await query;

            return result[0];
        } catch (error) {
            console.error('Error retrieving transaction:', error);
            throw error;
        }
    }

    async getTransactionByNameAmountDate(name: string, amount: string, date: Date): Promise<schema.Transaction[] | undefined> {
        try {
            const conditions = prepareTransactionQuery(name, amount, date);
            const db = await this.getDb();

            const query = db
                .select()
                .from(schema.transactions)
                .where(
                    and(
                        conditions.nameCondition,
                        conditions.amountCondition,
                        conditions.dateCondition
                    )
                );

            console.log('Generated SQL - [getTransactionByNameAmountDate]: ', query.toSQL());

            return await query;
        } catch (error) {
            console.error('Error retrieving transactions:', error);
            throw error;
        }
    }

    async updateTransaction(payload: TransactionUpdateData): Promise<schema.Transaction | undefined> {
        const db = await this.getDb();

        return await db.transaction(async (tx) => {
            try {
                const query = tx
                    .update(schema.transactions)
                    .set({
                        status: payload.status,
                        bankRefundUuid: payload.bankRefundUuid,
                        updatedAt: new Date(),
                    } as Partial<schema.Transaction>)
                    .where(eq(schema.transactions.id, payload.id));

                console.log('Generated SQL - [updateTransaction]: ', query.toSQL());

                await query;

                return await this.getTransactionById(payload.id);
            } catch (error) {
                console.error('Transaction failed, rolling back:', error);
                throw error;
            }
        });
    };

    async checkTransactionExists(tid: string, amount: number): Promise<boolean> {
        try {
            const db = await this.getDb();

            const query = db.select()
                .from(schema.transactions)
                .where(and(
                    eq(schema.transactions.uuid, tid),
                    eq(schema.transactions.amount, String(amount))
                ))
                .limit(1);

            console.log('Generated SQL - [checkTransactionExists]: ', query.toSQL());

            const result = await query;

            return result.length > 0;
        } catch (error) {
            console.error('Error checking transaction existence:', error);
            throw error;
        }
    }

    // --- Bank File Transactions Methods ---
    async recordBankFileTransaction(payload: TransactionCreateInterface): Promise<schema.Transaction> {
        console.log('Recording Bank File transaction:', payload);

        try {
            const db = await this.getDb();
            const [res] = await db.insert(schema.bank_file_transactions).values(payload);

            console.log('Bank File Transaction recorded:', { id: res.insertId });

            return await this.getTransactionById(res.insertId);
        } catch (error) {
            console.error('Error recording Bank File transaction:', error);
            throw error;
        }
    }

    async checkBankFileTransactionExists(utr: string, amount: string): Promise<boolean> {
        try {
            const db = await this.getDb();

            const query = db.select()
                .from(schema.bank_file_transactions)
                .where(and(
                    eq(schema.bank_file_transactions.utr, utr),
                    eq(schema.bank_file_transactions.amount, String(amount))
                ))
                .limit(1);

            console.log('Generated SQL - [checkBankFileTransactionExists]: ', query.toSQL());

            const result = await query;

            return result.length > 0;
        } catch (error) {
            console.error('Error checking transaction existence:', error);
            throw error;
        }
    }

    async getBankFileTransactionByStatus(status: string): Promise<schema.BankFileTransaction[] | undefined> {
        try {
            const db = await this.getDb();
            const query = db
                .select()
                .from(schema.bank_file_transactions)
                .where(eq(schema.bank_file_transactions.status, status));

            console.log('Generated SQL - [getBankFileTransactionByStatus]: ', query.toSQL());

            return await query;
        } catch (error) {
            console.error('Error retrieving transactions:', error);
            throw error;
        }
    }

    async updateBankFileTransactionStatus(utr: string, status: string): Promise<void> {
        try {
            const db = await this.getDb();
            const query = db
                .update(schema.bank_file_transactions)
                .set({ status: status } as Partial<schema.BankFileTransaction>)
                .where(eq(schema.bank_file_transactions.utr, utr));

            console.log('Generated SQL - [updateBankFileTransactionStatus]: ', query.toSQL());

            await query;
        } catch (error) {
            console.error('Error updating bank transaction status:', error);
            throw error;
        }
    }

    // --- File_Summaries Methods ---

    async createFileSummary(payload: FileSummaryCreateData): Promise<schema.FileSummary> {
        console.log('Recording refund:', payload);

        try {
            const db = await this.getDb();
            const [res] = await db.insert(schema.fileSummaries).values(payload);

            console.log('File summary recorded:', { id: res.insertId });

            return await this.getFileSummaryById(res.insertId);
        } catch (error) {
            console.error('Error recording file summary:', error);
            throw error;
        }
    }

    async getFileSummaryById(id: number): Promise<schema.FileSummary | undefined> {
        try {
            const db = await this.getDb();
            const query = db
                .select()
                .from(schema.fileSummaries)
                .where(eq(schema.fileSummaries.id, id));

            console.log('Generated SQL - [getFileSummaryById]: ', query.toSQL());

            const result = await query;

            return result[0];
        } catch (error) {
            console.error('Error retrieving file summary:', error);
            throw error;
        }
    }

    async checkFileNameExists(fileName: string): Promise<boolean> {
        const db = await this.getDb();

        try {
            const query = db.select()
                .from(schema.fileSummaries)
                .where(eq(schema.fileSummaries.fileName, fileName));

            console.log('Generated SQL - [checkFileNameExists]: ', query.toSQL());

            const result = await query;

            return result.length > 0;
        } catch (error) {
            console.error('Error checking filename existence:', error);
            throw error;
        }
    }

    async close(): Promise<void> {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
            this.db = null;
            console.log('Database connection closed');
        }
    }
}

export const dbInstance = new Database();
