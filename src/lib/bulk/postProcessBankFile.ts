import { Context } from 'grammy';

import { dbInstance } from '@/lib/db/client';
import { Transaction } from '@/lib/db/schema';
import { getTransactionsFromFile, processExcelFile } from '@/lib/file_helper';
import { BulkBot } from '@/lib/telegram/bot-bulk-instance';

export const postProcessBankFile = async (ctx: Context) => {
    try {
        const fileId = ctx.msg.document.file_id;
        const fileName = ctx.msg.document.file_name;

        const fileUrl = await BulkBot.getFileUrl(fileId);
        const fileData = await processExcelFile(fileUrl);

        const transactions = getTransactionsFromFile(fileData.transactions, fileName);

        const { errors } = await createTransaction(transactions);

        await ctx.api.sendMessage(ctx.chat.id,
            'Transaction Recorded. CronJob will be picking soon 🔜' +
            '\n```Errors\n' + errors.join('\n') + '```',
            { reply_to_message_id: ctx.message.message_id, parse_mode: 'Markdown' }
        );
    } catch (e) {
        console.log(e);

        await ctx.api.sendMessage(ctx.chat.id, e.message || JSON.stringify(e), { reply_to_message_id: ctx.message.message_id });
    }
};

const createTransaction = async (transactions: Partial<Transaction>[]) => {
    const errors = [];

    await dbInstance.initialize();
    const transactionChecks = transactions.map(async (tx) => {
        const exists = await dbInstance.checkBankFileTransactionExists(tx.utr, tx.amount);

        if (exists) {
            errors.push(`Duplicate transaction found: UTR ${tx.utr} with amount ${tx.amount}`);
        } else {
            await dbInstance.recordBankFileTransaction(tx as any);
        }
    });

    await Promise.all(transactionChecks);

    return { errors };
};
