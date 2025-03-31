import { mysqlTable, int, varchar, text, timestamp } from 'drizzle-orm/mysql-core';

export const bankRefunds = mysqlTable('Bank_Refunds', {
    id: int('id').primaryKey().autoincrement(),
    uniqueId: varchar('unique_id', { length: 255 }).notNull().unique(),
    ocrText: text('ocr_text').notNull(),
    date: varchar('date', { length: 50 }),
    name: varchar('name', { length: 255 }),
    amount: varchar('amount', { length: 50 }),
    refundUtr: varchar('refund_utr', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow(),
});

export type BankRefund = typeof bankRefunds.$inferSelect;
