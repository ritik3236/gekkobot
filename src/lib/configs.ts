import { BotConfig } from '@/lib/types';

export const botsConfigs: BotConfig[] = [
    {
        adminChatId: +process.env.TELEGRAM_ADMIN_CHAT_ID,
        botName: 'PayoutX',
        chatIds: [-4644489581, 1282110140],
        polling: false,
        token: process.env.TELEGRAM_BOT_TOKEN_XBOT,
        webhookUrl: 'https://gekkobot-delta.vercel.app/api/telegram/xbot',
    },
    {
        adminChatId: +process.env.TELEGRAM_ADMIN_CHAT_ID,
        botName: 'PayoutY',
        chatIds: [-4644489581, 1282110140],
        polling: false,
        token: process.env.TELEGRAM_BOT_TOKEN_YBOT,
        webhookUrl: 'https://gekkobot-delta.vercel.app/api/telegram/ybot',
    },
];
