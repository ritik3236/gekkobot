import { mysqlTable, int, varchar, text, timestamp, decimal } from 'drizzle-orm/mysql-core';

export const bankRefunds = mysqlTable('bank_refunds', {
    amount: decimal('amount', { precision: 10, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow(),
    fileUrl: varchar('file_url', { length: 255 }),
    id: int('id').primaryKey().autoincrement(),
    name: varchar('name', { length: 255 }),
    ocrText: text('ocr_text').notNull(),
    refundUtr: varchar('utr', { length: 255 }),
    txnDate: varchar('txn_date', { length: 50 }),
    uniqueId: varchar('unique_id', { length: 255 }).notNull().unique(),
});

export type BankRefund = typeof bankRefunds.$inferSelect;
