import { postProcessBankFile } from '@/lib/bulk/postProcessBankFile';
import { TelegramBot } from '@/lib/telegram/bot';

export const UtrBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_UTR || '');

UtrBot.bot.init();

export const UTR_CHAT_ID = process.env.TELEGRAM_CHAT_ID_UTR || -4751668590;

UtrBot.bot.on('message:document', async (ctx) => {
    console.log('Handling document of UTR bot', ctx.msg);

    if (ctx.msg?.document?.file_id || ctx.message?.document?.file_id) {
        await postProcessBankFile(ctx as any);
    }
});
