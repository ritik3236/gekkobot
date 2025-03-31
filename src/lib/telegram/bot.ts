import TelegramBot from 'node-telegram-bot-api';

export type TelegramMessage = {
    chat: {
        id: number
    }
    message_id: number
    photo?: { file_id: string }[]
};

export class TelegramBotService {
    private static instance: TelegramBot;
    private static isInitialized = false;

    public static get bot(): TelegramBot {
        if (!TelegramBotService.instance) {
            if (!process.env.TELEGRAM_BOT_TOKEN_OCR_BOT) {
                throw new Error('TELEGRAM_BOT_TOKEN is not defined');
            }

            TelegramBotService.instance = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_OCR_BOT, {
                webHook: process.env.NODE_ENV === 'production' ? {
                    host: process.env.HOST || '0.0.0.0',
                    port: parseInt(process.env.PORT || '3000'),
                } : undefined,
            });

            if (process.env.NODE_ENV === 'development') {
                TelegramBotService.instance.startPolling();
            }

            this.setupErrorHandling();
        }

        return TelegramBotService.instance;
    }

    private static setupErrorHandling(): void {
        this.instance.on('polling_error', (error) => {
            console.error('Polling error:', error);
        });

        this.instance.on('webhook_error', (error) => {
            console.error('Webhook error:', error);
        });
    }

    public static async initializeWebhook(): Promise<void> {
        if (this.isInitialized || process.env.NODE_ENV !== 'production') return;

        try {
            await this.bot.setWebHook(
                `${process.env.NEXTAUTH_URL}/api/telegram/webhook`,
                {
                    max_connections: 40,
                    allowed_updates: ['message'],
                }
            );
            this.isInitialized = true;
            console.log('Webhook configured successfully');
        } catch (error) {
            console.error('Webhook setup failed:', error);
            throw error;
        }
    }

    public static async sendProcessingMessage(chatId: number): Promise<void> {
        await this.bot.sendChatAction(chatId, 'typing');
        await this.bot.sendMessage(
            chatId,
            '🔄 Processing your refund image...',
            { parse_mode: 'Markdown' }
        );
    }

    public static async sendResultMessage(
        chatId: number,
        replyToMessageId: number,
        record: any
    ): Promise<void> {
        const message = `
✅ *Refund Processed Successfully*
━━━━━━━━━━━━━━
• *Date*: ${record.date.toLocaleDateString()}
• *Name*: ${record.name}
• *Amount*: ₹${record.amount.toLocaleString()}
• *UTR*: \`${record.utr}\`
    `.trim();

        await this.bot.sendMessage(chatId, message, {
            reply_to_message_id: replyToMessageId,
            parse_mode: 'MarkdownV2',
        });
    }

    public static async sendErrorMessage(
        chatId: number,
        replyToMessageId: number
    ): Promise<void> {
        await this.bot.sendMessage(
            chatId,
            '❌ Failed to process refund image',
            { reply_to_message_id: replyToMessageId }
        );
    }
}
