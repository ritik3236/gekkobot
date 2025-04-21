import { postProcessBankFile } from '@/lib/bulk/postProcessBankFile';
import { TelegramBot } from '@/lib/telegram/bot';

export const UtrBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_UTR || '');

UtrBot.bot.init();

export const UTR_CHAT_ID = process.env.TELEGRAM_CHAT_ID_UTR || -4751668590;

// check for reply of a msg
UtrBot.bot.on('message', async (ctx) => {
    console.log('Handling message of UTR bot', ctx.msg);

    if (ctx.msg.document?.file_id) {
        await postProcessBankFile(ctx);
    } else {
        console.error('Message is not a document or bot not allowed in group');
    }
});
