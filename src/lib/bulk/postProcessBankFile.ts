import { Update } from '@grammyjs/types';

import { dbInstance } from '@/lib/db/client';
import { Transaction } from '@/lib/db/schema';
import { getTransactionsFromFile, processExcelFile } from '@/lib/file_helper';
import { UtrBot } from '@/lib/telegram/utr-bot-instance';

export const postProcessBankFile = async (ctx: Update) => {

    console.log('IN COMMAND', ctx);
    const chatId = ctx.message.chat.id;

    try {
        const fileId = ctx.message.document.file_id;
        const fileName = ctx.message.document.file_name;

        const fileUrl = await UtrBot.getFileUrl(fileId);
        const fileData = await processExcelFile(fileUrl);

        const transactions = getTransactionsFromFile(fileData.transactions, fileName);

        const { errors } = await createTransaction(transactions);

        await UtrBot.bot.api.sendMessage(chatId,
            'Transaction Recorded. CronJob will be picking soon 🔜' +
            '\n```Errors\n' + errors.join('\n') + '```',
            { reply_to_message_id: ctx.message.message_id, parse_mode: 'Markdown' }
        );
    } catch (e) {
        console.log(e);

        await UtrBot.bot.api.sendMessage(chatId, e.message || JSON.stringify(e), { reply_to_message_id: ctx.message.message_id });
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
