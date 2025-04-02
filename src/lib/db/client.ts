import { and, eq, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql, { Connection } from 'mysql2/promise';

import * as schema from '@/lib/db/schema';

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

    private async initialize(): Promise<void> {
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

    async getRefundByEid(uuid: string): Promise<schema.BankRefund | undefined> {
        try {
            const db = await this.getDb();
            const result = await db
                .select()
                .from(schema.bankRefunds)
                .where(eq(schema.bankRefunds.uuid, uuid));

            return result[0];
        } catch (error) {
            console.error('Error retrieving refund:', error);
            throw error;
        }
    }

    async getRefundById(id: number | string): Promise<schema.BankRefund | undefined> {
        try {
            const db = await this.getDb();
            const result = await db
                .select()
                .from(schema.bankRefunds)
                .where(or(
                    eq(schema.bankRefunds.id, id as number),
                    eq(schema.bankRefunds.uuid, id as string)
                ));

            return result[0];
        } catch (error) {
            console.error('Error retrieving refund:', error);
            throw error;
        }
    }

    async updateRefund(payload: RefundUpdatePayload): Promise<schema.BankRefund | undefined> {
        try {
            const db = await this.getDb();

            await db
                .update(schema.bankRefunds)
                .set({
                    transactionUuid: payload.transactionUuid,
                    fileName: payload.fileName,
                    sNo: payload.sNo,
                } as Partial<schema.BankRefund>)
                .where(eq(schema.bankRefunds.id, payload.id));

            return await this.getRefundById(payload.id);
        } catch (error) {
            console.error('Error updating refund:', error);
            throw error;
        }
    }

    async getAllRefunds(): Promise<schema.BankRefund[]> {
        try {
            const db = await this.getDb();

            return await db.select().from(schema.bankRefunds);
        } catch (error) {
            console.error('Error retrieving all refunds:', error);
            throw error;
        }
    }

    // --- Transactions Methods ---

    async getTransactionById(id: number | string): Promise<schema.Transaction | undefined> {
        try {
            const db = await this.getDb();
            const result = await db
                .select()
                .from(schema.transactions)
                .where(or(
                    eq(schema.transactions.id, id as number),
                    eq(schema.transactions.uuid, id as string)
                ));

            return result[0];
        } catch (error) {
            console.error('Error retrieving transaction:', error);
            throw error;
        }
    }

    async getTransactionByNameAndAmount(name: string, amount: string): Promise<schema.Transaction[] | undefined> {
        try {
            const db = await this.getDb();

            return await db
                .select()
                .from(schema.transactions)
                .where(
                    and(
                        eq(schema.transactions.accountHolderName, name),
                        eq(schema.transactions.amount, amount)
                    )
                );
        } catch (error) {
            console.error('Error retrieving transactions:', error);
            throw error;
        }
    }

    async updateTransaction(payload: TransactionUpdateData): Promise<schema.Transaction | undefined> {
        try {
            const db = await this.getDb();

            await db
                .update(schema.transactions)
                .set({ status: payload.status, ...(payload.bankRefundUuid && { bankRefundUuid: payload.bankRefundUuid }) } as Partial<schema.Transaction>)
                .where(eq(schema.transactions.id, payload.id));

            return this.getTransactionById(payload.id);
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    };

    // --- File_Summaries Methods ---

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
