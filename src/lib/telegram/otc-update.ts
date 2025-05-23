import { TelegramBot } from '@/lib/telegram/bot';

export const OtcPriceUpdateBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_OTC_PRICE_UPDATE || '');

OtcPriceUpdateBot.bot.init();

OtcPriceUpdateBot.bot.command('start', async (ctx) => {
    await ctx.reply('Welcome to the OTC Bot.');
});

export const OTC_CHAT_ID = process.env.TELEGRAM_CHAT_ID_OTC_PRICE || -4751668590;
