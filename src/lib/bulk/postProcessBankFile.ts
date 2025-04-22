import { Update } from '@grammyjs/types';

import { dbInstance } from '@/lib/db/client';
import { Transaction } from '@/lib/db/schema';
import { getTransactionsFromFile, processExcelFile } from '@/lib/file_helper';
import { UtrBot } from '@/lib/telegram/utr-bot-instance';

export const postProcessBankFile = async (ctx: Update) => {

    console.log('Started postProcessBankFile', ctx);
    const chatId = ctx.message.chat.id;

    try {
        const fileId = ctx.message.document.file_id;
        const fileName = ctx.message.document.file_name;

        const fileUrl = await UtrBot.getFileUrl(fileId);
        const fileData = await processExcelFile(fileUrl);

        const transactions = getTransactionsFromFile(fileData.transactions, fileName);

        const { errors, count } = await createTransaction(transactions);

        await UtrBot.bot.api.sendMessage(chatId,
            count > 0 ? 'Transaction Recorded. CronJob will be picking soon 🔜' : '' +
                '\nTransaction Added `' + count + '`' +
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
    let count = 0;

    await dbInstance.initialize();
    const transactionChecks = transactions.map(async (tx) => {
        const exists = await dbInstance.checkBankFileTransactionExists(tx.utr, tx.amount);

        if (exists) {
            errors.push(`Duplicate transaction found: UTR ${tx.utr} with amount ${tx.amount}`);
        } else {
            await dbInstance.recordBankFileTransaction(tx as any);
            count++;
        }
    });

    await Promise.all(transactionChecks);

    return { errors, count };
};
