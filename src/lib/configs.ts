import { BotConfig } from '@/lib/types';

export const botsConfig: BotConfig[] = [
    {
        adminChatId: +process.env.ADMIN_CHAT_ID,
        botName: 'PayoutX',
        chatIds: [-4644489581, 1282110140, 987654321],
        polling: false,
        token: '8075096031:AAF9Evf1iraySnxV6-6zc-fNIWhZ8JLFuOk',
        webhookUrl: process.env.WEBHOOK_URL_1,
    },
    {
        adminChatId: +process.env.ADMIN_CHAT_ID,
        botName: 'Mezu',
        chatIds: [-4644489581, 1282110140, 444555666],
        polling: false,
        token: '7834314818:AAFGm4-xyLTtmH6Lyx47y1pXXs-nEpifUt8',
        webhookUrl: process.env.WEBHOOK_URL_2,
    },
];
