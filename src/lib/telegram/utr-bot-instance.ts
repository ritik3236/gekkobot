import { postProcessBankFile } from '@/lib/bulk/postProcessBankFile';
import { TelegramBot } from '@/lib/telegram/bot';

export const UtrBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_UTR || '');

UtrBot.bot.init();
export const UTR_CHAT_ID = process.env.TELEGRAM_CHAT_ID_UTR || -4751668590;

// check for reply of a msg
UtrBot.bot.on('message', async (ctx) => {
    if (ctx.msg.document?.file_id && ctx.chat.id === UTR_CHAT_ID) {
        await postProcessBankFile(ctx);
    }
});
