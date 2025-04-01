import { eq } from 'drizzle-orm';
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
    eid: string;
    ocrText: string;
    txnDate: string | null;
    name: string | null;
    amount: string | null;
    fileUrl: string | null;
    refundUtr: string | null;
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
        const existingRefund = await this.getRefundByEid(payload.eid);

        if (existingRefund) {
            throw new Error(`Refund with UTR ${payload.eid} already exists`);
        }

        try {
            const db = await this.getDb();
            const res = await db.insert(schema.bankRefunds).values(payload);
            const insertedId = res[0].insertId;

            console.log('Refund recorded:', { id: insertedId });

            return { id: insertedId, ...payload, createdAt: new Date() };
        } catch (error) {
            console.error('Error recording refund:', error);
            throw error;
        }
    }

    async getRefundByEid(eid: string): Promise<schema.BankRefund | undefined> {
        try {
            const db = await this.getDb();
            const result = await db
                .select()
                .from(schema.bankRefunds)
                .where(eq(schema.bankRefunds.eid, eid));

            console.log('Refund retrieved:', eid, result[0]);

            return result[0];
        } catch (error) {
            console.error('Error retrieving refund:', error);
            throw error;
        }
    }

    async getRefundById(id: number): Promise<schema.BankRefund | undefined> {
        try {
            const db = await this.getDb();
            const result = await db
                .select()
                .from(schema.bankRefunds)
                .where(eq(schema.bankRefunds.id, +id));

            console.log('Refund retrieved:', id, result[0]);

            return result[0];
        } catch (error) {
            console.error('Error retrieving refund:', error);
            throw error;
        }
    }

    async getAllRefunds(): Promise<schema.BankRefund[]> {
        try {
            const db = await this.getDb();
            const result = await db.select().from(schema.bankRefunds);

            console.log('All refunds retrieved:', result);

            return result;
        } catch (error) {
            console.error('Error retrieving all refunds:', error);
            throw error;
        }
    }

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
