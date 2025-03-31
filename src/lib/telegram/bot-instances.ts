import * as process from 'node:process';

import axios from 'axios';

import { TelegramBot } from '@/lib/telegram/bot';

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
    const uniqueId = ctx.message?.text?.split(' ')[1]; // Extract uniqueId from command (e.g., "/refund 123")

    if (!uniqueId) {
        await ctx.reply('Please provide a uniqueId. Usage: /refund <uniqueId>');

        return;
    }

    try {
        const response = await axios.get(`${process.env.VERCEL_URL}/api/refunds/${uniqueId}`);
        const refund = response.data.data;

        const message = `
Refund Details:
- Unique ID: ${refund.uniqueId}
- Amount: ${refund.amount}
- Name: ${refund.name}
- Refund UTR: ${refund.refundUtr}
- Transaction Date: ${refund.txnDate}
        `.trim();

        await ctx.reply(message);
    } catch (error) {
        if (error.response?.status === 404) {
            await ctx.reply(`Refund with uniqueId ${uniqueId} not found`);
        } else {
            console.error('Error fetching refund:', error);
            await ctx.reply('Error fetching refund details');
        }
    }
});
