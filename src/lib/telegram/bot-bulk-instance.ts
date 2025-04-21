import { postProcessBulkFile } from '@/lib/bulk/postProcessBulkFile';
import { TelegramBot } from '@/lib/telegram/bot';

export const BulkBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_BULK || '');

BulkBot.bot.init();

BulkBot.bot.command('start', async (ctx) => {
    await ctx.reply('Welcome to the OCR Bot! Send me an image and I will process it for you.');
});

BulkBot.bot.command('help', async (ctx) => {
    await ctx.reply('Available commands:\n/start - Start the bot\n/help - Get help\n/ping - Ping the bot');
});

BulkBot.bot.command('ping', async (ctx) => {
    await ctx.reply('Pong!');
});

// check for reply of a msg
BulkBot.bot.on('message', async (ctx) => {
    if (ctx.msg.reply_to_message && ctx.msg.text?.toLowerCase() === 'verify') {
        const repliedMessage = ctx.msg.reply_to_message;

        await postProcessBulkFile(repliedMessage, ctx);
    }
});

BulkBot.bot.on('my_chat_member', async (ctx) => {
    const oldStatus = ctx.update.my_chat_member.old_chat_member.status;
    const newStatus = ctx.update.my_chat_member.new_chat_member.status;
    const chat = ctx.chat;

    if (oldStatus === 'left' && newStatus === 'member') {
        console.log(`✅ Bot added to group: ${chat.title}`);
        await ctx.api.sendMessage(process.env.TELEGRAM_ADMIN_CHAT_ID, `Bulk Bot added to group: ${chat.title}`);
    } else if (oldStatus === 'member' && newStatus === 'left') {
        console.log(`❌ Bot removed from group: ${chat.title}`);
        await ctx.api.sendMessage(process.env.TELEGRAM_ADMIN_CHAT_ID, `Bulk Bot removed from group: ${chat.title}`);
    } else {
        console.log(`Bot status changed in group: ${chat.title} | ${oldStatus} → ${newStatus}`);
        await ctx.api.sendMessage(process.env.TELEGRAM_ADMIN_CHAT_ID, `Bulk Bot status changed in group: ${chat.title} | ${oldStatus} → ${newStatus}`);
    }
});
