import * as process from 'node:process';

import axios from 'axios';

import { processImageInBackground } from '@/lib/db/refund';
import { Transaction } from '@/lib/db/schema';
import { TelegramBot } from '@/lib/telegram/bot';
import { refundAndTransactionMessageBuilder, refundMessageBuilder } from '@/lib/telegram/messageBulider';

// Bot 1 (e.g., your existing OCR bot)
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
    const id = ctx.message?.text?.split(' ')[1].trim();

    if (!id) {
        await ctx.reply('Please provide an id. Usage: /refund <id>');

        return;
    }

    try {
        const refundResponse = await axios.get(`${process.env.VERCEL_BASE_URL}/api/refunds/${id}`);
        const refund = refundResponse.data.data;

        if (!refund?.id) {
            await ctx.reply(`Refund with id ${id} not found`);

            return;
        }

        const transactionResponse = await axios.get(`${process.env.VERCEL_BASE_URL}/api/transactions/${refund.transactionUuid}`);
        const transaction = transactionResponse.data.data as Transaction;

        const message = 'Record Found\n' + refundMessageBuilder(refund);

        await ctx.reply(message, { parse_mode: 'MarkdownV2' });
    } catch (error) {
        if (error.response?.status === 404) {
            await ctx.reply(`Refund with id ${id} not found`);
        } else {
            console.error('Error fetching refund:', error);
            await ctx.reply('Error fetching refund details');
        }
    }
});

OCRBot.bot.command('status', async (ctx) => {
    const id = ctx.message?.text?.split(' ')[1]?.trim();

    if (!id) {
        await ctx.reply('Please provide an id. Usage: /status <id>');

        return;
    }

    try {
        const transactionResponse = await axios.get(`${process.env.VERCEL_BASE_URL}/api/transactions/${id}`);
        const transaction = transactionResponse.data.data as Transaction;

        if (!transaction?.id) {
            await ctx.reply(`Transaction with id ${id} not found`);

            return;
        }

        const refundResponse = await axios.get(`${process.env.VERCEL_BASE_URL}/api/refunds/${transaction.bankRefundUuid}`);
        const refund = refundResponse.data.data;

        const message = 'Record Found\n' + refundAndTransactionMessageBuilder(refund, transaction);

        await ctx.reply(message, { parse_mode: 'MarkdownV2' });
    } catch (error) {
        if (error.response?.status === 404) {
            await ctx.reply(`Transaction with id ${id} not found`);
        } else {
            console.error('Error fetching transaction:', error);
            await ctx.reply('Error fetching transaction details');
        }
    }
});

OCRBot.bot.on('message:photo', async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileId = photo.file_id;

    await processImageInBackground(ctx.message.chat.id, fileId, ctx);
});
