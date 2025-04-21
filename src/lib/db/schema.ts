import { datetime, decimal, int, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';

export const bankRefunds = mysqlTable('bank_refunds', {
    id: int('id').primaryKey().autoincrement(),

    amount: decimal('amount', { precision: 10, scale: 2 }),
    fileUrl: varchar('file_url', { length: 255 }),
    name: varchar('account_holder_name', { length: 255 }),
    ocrText: text('ocr_text').notNull(),
    refundUtr: varchar('utr', { length: 255 }),
    txnDate: datetime('txn_date'),
    uuid: varchar('uuid', { length: 64 }).notNull().unique(),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),

    fileName: varchar('file_name', { length: 255 }),
    sNo: int('s_no'),
    transactionUuid: varchar('transaction_uuid', { length: 64 }),
});

export type BankRefund = typeof bankRefunds.$inferSelect;

const transactionTableColumn = {
    id: int('id').primaryKey().autoincrement(),

    accountHolderName: varchar('account_holder_name', { length: 64 }),
    accountNumber: varchar('account_number', { length: 32 }),
    amount: decimal('amount', { precision: 15, scale: 2 }),
    fileName: varchar('file_name', { length: 255 }),
    ifscCode: varchar('ifsc_code', { length: 16 }),
    remark: varchar('remark', { length: 255 }),
    sNo: int('s_no'),
    status: varchar('status', { length: 16 }),
    transferType: varchar('transfer_type', { length: 16 }),
    txnDate: datetime('txn_date'),
    utr: varchar('utr', { length: 64 }),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),

    bankRefundUuid: varchar('bank_refund_uuid', { length: 64 }),
};

export const transactions = mysqlTable('transactions', {
    ...transactionTableColumn,
    uuid: varchar('uuid', { length: 64 }).notNull().unique(),
});
export type Transaction = typeof transactions.$inferSelect;

export const bank_file_transactions = mysqlTable('bank_file_transactions', {
    ...transactionTableColumn,
    uuid: varchar('uuid', { length: 64 }),
});

export type BankFileTransaction = typeof bank_file_transactions.$inferSelect;

export const fileSummaries = mysqlTable('file_summaries', {
    id: int('id').primaryKey().autoincrement(),

    createdAt: timestamp('created_at').defaultNow(),
    duplicateCount: varchar('duplicate_count', { length: 16 }),
    fileName: varchar('file_name', { length: 255 }).notNull().unique(),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }),
    transactionCount: varchar('transaction_count', { length: 16 }),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export type FileSummary = typeof fileSummaries.$inferSelect;
