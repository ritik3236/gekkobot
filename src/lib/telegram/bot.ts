import { ParseMode } from '@grammyjs/types';
import { Bot } from 'grammy';

import { Logger } from '@/lib/logger';
import { escapeTelegramEntities } from '@/lib/utils';

export class TelegramBot {
    private readonly TELEGRAM_ENDPOINT = 'https://api.telegram.org';
    private readonly TELEGRAM_FILE_API: string;
    private readonly botName: string;
    public bot: Bot;

    constructor(token: string) {
        if (!token) {
            throw new Error('Telegram bot token is not defined');
        }

        this.TELEGRAM_FILE_API = `${this.TELEGRAM_ENDPOINT}/file/bot${token}`;
        this.bot = new Bot(token);
        this.botName = 'BotNoName';
    }

    async sendMessage(
        chatId: number | string,
        message: string,
        context: string = 'OCR_BOT',
        options?: { parse_mode?: ParseMode; disable_web_page_preview?: boolean }
    ): Promise<void> {
        try {
            await this.sendMsg(chatId, message, options);
            Logger.info(context, `Message sent to ${chatId}`, this.botName);
        } catch (_error) {
            try {
                Logger.warn(context, `Msg Send failed for ${chatId}, trying as markdownV1`, this.botName, { message });
                await this.sendMsg(chatId, message, { parse_mode: 'MarkdownV1' });
            } catch (_error) {
                try {
                    Logger.warn(context, `Msg Send failed for ${chatId}, trying as plain text`, this.botName, { message });
                    await this.sendMsg(chatId, escapeTelegramEntities(message));
                } catch (error) {
                    Logger.error(context, error, this.botName, { message });
                    throw error;
                }
            }
        }
    }

    async sendMsg(chatId: number | string, text: string, options?): Promise<void> {
        await this.bot.api.sendMessage(chatId, text, { ...options });
    }

    async sendPhoto(chatId: number, photo: string): Promise<void> {
        await this.bot.api.sendPhoto(chatId, photo);
    }

    async getFileUrl(fileId: string): Promise<string> {
        try {
            const { file_path } = await this.bot.api.getFile(fileId);

            return `${this.TELEGRAM_FILE_API}/${file_path}`;
        } catch (error) {
            console.error('Error getting file URL:', error);
            throw error;
        }
    }
}
