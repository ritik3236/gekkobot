import { decimal, int, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';

export const bankRefunds = mysqlTable('bank_refunds', {
    id: int('id').primaryKey().autoincrement(),

    amount: decimal('amount', { precision: 10, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow(),
    fileUrl: varchar('file_url', { length: 255 }),
    name: varchar('account_holder_name', { length: 255 }),
    ocrText: text('ocr_text').notNull(),
    refundUtr: varchar('utr', { length: 255 }),
    txnDate: varchar('txn_date', { length: 50 }),
    uuid: varchar('uuid', { length: 255 }).notNull().unique(),
});

export type BankRefund = typeof bankRefunds.$inferSelect;

export const transactions = mysqlTable('transactions', {
    id: int('id').primaryKey().autoincrement(),

    accountHolderName: varchar('account_holder_name', { length: 64 }),
    accountNumber: varchar('account_number', { length: 32 }),
    amount: decimal('amount', { precision: 15, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow(),
    fileName: varchar('file_name', { length: 255 }),
    ifscCode: varchar('ifsc_code', { length: 16 }),
    remark: varchar('remark', { length: 255 }),
    sNo: int('s_no'),
    status: varchar('status', { length: 16 }),
    transferType: varchar('transfer_type', { length: 16 }),
    updatedAt: timestamp('updated_at').defaultNow(),
    utr: varchar('utr', { length: 64 }),
    uuid: varchar('uuid', { length: 64 }).notNull().unique(),
});

export type Transaction = typeof transactions.$inferSelect;
