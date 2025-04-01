import * as process from 'node:process';

import axios from 'axios';

import { processImageInBackground } from '@/lib/db/refund';
import { TelegramBot } from '@/lib/telegram/bot';
import { formatNumber } from '@/lib/utils';

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
    const id = ctx.message?.text?.split(' ')[1]; // Extract id from command (e.g., "/refund 123")

    if (!id) {
        await ctx.reply('Please provide a id. Usage: /refund <id>');

        return;
    }

    try {
        const response = await axios.get(`${process.env.VERCEL_BASE_URL}/api/refunds/${id}`);
        const refund = response.data.data;
        const msgPayload = {
            'Id': refund.id,

            'Amount': formatNumber(refund.amount, { style: 'currency', currency: 'INR' }),
            'Name': refund.name,
            'Refund UTR': refund.refundUtr,
            'Transaction Date': refund.txnDate,
        };
        const msg = Object.entries(msgPayload).map(([label, value]) => `${label}: ${value}`).join('\n');
        const message = 'Found Record with id: ' + id + '\n```Refund_Details:\n' + msg + '```';

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

OCRBot.bot.on('message:photo', async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileId = photo.file_id;

    await processImageInBackground(ctx.message.chat.id, fileId, ctx);
});
