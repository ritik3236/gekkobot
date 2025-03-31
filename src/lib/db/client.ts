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
    uniqueId: string;
    ocrText: string;
    txnDate?: string | null;
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
            host: process.env.DB_HOST || 'data-record.cbmwccaeejw6.ap-south-1.rds.amazonaws.com',
            user: process.env.DB_USER || 'dev',
            password: process.env.DB_PASSWORD || '836d69b8f15091445a2',
            database: process.env.DB_NAME || 'test',
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

    async recordRefund(payload: RefundData): Promise<void> {
        const db = await this.getDb();

        await db.insert(schema.bankRefunds).values(payload);
        console.log('Refund recorded:', payload.uniqueId);
    }

    async getRefundById(uniqueId: string): Promise<schema.BankRefund | undefined> {
        try {
            const db = await this.getDb();
            const result = await db
                .select()
                .from(schema.bankRefunds)
                .where(eq(schema.bankRefunds.uniqueId, uniqueId))
                .limit(1);

            console.log('Refund retrieved:', uniqueId, result[0]);

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
