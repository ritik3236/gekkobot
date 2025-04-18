import * as process from 'node:process';

import { dbInstance } from '@/lib/db/client';
import { processImageInBackground } from '@/lib/refund';
import { TelegramBot } from '@/lib/telegram/bot';
import { buildRefundAndTransactionMsg } from '@/lib/telegram/messageBulider';

export const OCRBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_OCR || '');

OCRBot.bot.init();

OCRBot.bot.command('start', (ctx) => {
    ctx.reply('Welcome to the OCR Bot! Send me an image and I will process it for you.');
});

OCRBot.bot.command('help', (ctx) => {
    ctx.reply('Available commands:\n/start - Start the bot\n/help - Get help\n/ping - Ping the bot');
});

OCRBot.bot.command('ping', (ctx) => {
    ctx.reply('Pong!');
});

OCRBot.bot.command('refund', async (ctx) => {
    const id = ctx.message?.text?.split(' ')[1]?.trim();

    if (!id) {
        await ctx.reply('Please provide an id. Usage: /refund <id>');

        return;
    }

    try {
        const refund = await dbInstance.getRefundById(id);

        if (!refund?.id) {
            await ctx.reply(`Refund with id ${id} not found`);

            return;
        }

        const transaction = await dbInstance.getTransactionById(refund.transactionUuid);

        const message = 'Record Found\n' + buildRefundAndTransactionMsg(refund, transaction);

        await ctx.reply(message, { parse_mode: 'MarkdownV2' });
    } catch (error) {
        console.error('Error fetching refund:', error);
        await ctx.reply('Error fetching refund details');
    }
});

OCRBot.bot.command('txn', async (ctx) => {
    const id = ctx.message?.text?.split(' ')[1]?.trim();

    if (!id) {
        await ctx.reply('Please provide an id. Usage: /txn <id>');

        return;
    }

    try {
        const transaction = await dbInstance.getTransactionById(id);

        if (!transaction?.id) {
            await ctx.reply(`Transaction with id ${id} not found`);

            return;
        }

        const refund = await dbInstance.getRefundById(transaction.bankRefundUuid);

        const message = 'Record Found\n' + buildRefundAndTransactionMsg(refund, transaction);

        await ctx.reply(message, { parse_mode: 'MarkdownV2' });
    } catch (error) {
        console.error('Error fetching transaction:', error);
        await ctx.reply('Error fetching transaction details');
    }
});

OCRBot.bot.on('message:photo', async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileId = photo.file_id;

    await processImageInBackground(ctx.message.chat.id, fileId, ctx);
});
