import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql, { Connection } from 'mysql2/promise';

import * as schema from '@/lib/db/schema';

const dbConfig = {
    host: process.env.DB_HOST || 'data-record.cbmwccaeejw6.ap-south-1.rds.amazonaws.com',
    user: process.env.DB_USER || 'dev',
    password: process.env.DB_PASSWORD || '836d69b8f15091445a2',
    database: process.env.DB_NAME || 'test',
};

let db: ReturnType<typeof drizzle> | undefined;

export async function getDb(): Promise<ReturnType<typeof drizzle>> {
    if (!db) {
        const connection: Connection = await mysql.createConnection(dbConfig);

        db = drizzle(connection, { schema, mode: 'default' });
    }

    return db;
}

interface RefundData {
    uniqueId: string;
    ocrText: string;
    date?: string | null;
    name?: string | null;
    amount?: string | null;
    refundUtr?: string | null;
}

export async function recordRefund({ uniqueId, ocrText, date, name, amount, refundUtr }: RefundData): Promise<void> {
    const db = await getDb();

    await db
        .insert(schema.bankRefunds)
        .values({ uniqueId, ocrText, date, name, amount, refundUtr })
        .onDuplicateKeyUpdate({ set: { ocrText } });
}

export async function getRefundById(uniqueId: string): Promise<schema.BankRefund | undefined> {
    const db = await getDb();
    const result = await db
        .select()
        .from(schema.bankRefunds)
        .where(eq(schema.bankRefunds.uniqueId, uniqueId))
        .limit(1);

    return result[0];
}
