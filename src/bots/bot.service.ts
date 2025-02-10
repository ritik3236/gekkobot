import { EventEmitter } from 'events';

import TelegramBot from 'node-telegram-bot-api';

import { Logger } from '@/lib/logger';
import { BotConfig, BotService } from '@/lib/types';

export abstract class BaseTelegramBotService extends EventEmitter {
    readonly bot: TelegramBot;
    protected readonly config: BotConfig;
    private botUsername: string | null = null;
    protected commandHandlers: Record<string, { desc: string, cmd: (msg: TelegramBot.Message) => Promise<void> }> = {};
    protected services: BotService[] = [];

    protected constructor(config: BotConfig) {
        super();
        this.config = config;
        this.bot = new TelegramBot(config.token, { polling: config.polling });
    }

    public async initialize(): Promise<void> {
        if (!this.config.polling && this.config.webhookUrl) {
            await this.setupWebhook();
        }

        await this.registerCommands();
        this.setupListeners();
        this.messageListener();
        this.errorListeners();
        this.services.forEach((service) => service.start());

        Logger.info('INIT', 'Bot initialized 🚀', this.config.botName);
    }

    private async setupWebhook(): Promise<void> {
        await this.bot.setWebHook(this.config.webhookUrl, {
            allowed_updates: ['message', 'callback_query', 'my_chat_member'],
            secret_token: process.env.TELEGRAM_SECRET_TOKEN,
        });
        Logger.info('WEBHOOK', `Webhook set to ${this.config.webhookUrl}`, this.config.botName);
    }

    private async registerCommands(): Promise<void> {
        const commands = Object.keys(this.commandHandlers).map((command) => ({
            command,
            description: this.commandHandlers[command].desc,
        }));

        await this.bot.setMyCommands(commands);
        Logger.info('COMMANDS', `Registered ${commands.length} commands`, this.config.botName);
    }

    private setupListeners(): void {
        this.bot.on('my_chat_member', async (msg) => {
            const chat = msg.chat;
            const status = msg.new_chat_member?.status;

            if (status === 'member' || status === 'administrator') {
                await this.handleBotAddedToChat(chat);
            } else if (status === 'kicked' || status === 'left') {
                await this.handleBotRemovedFromChat(chat);
            }
        });
    }

    private messageListener(): void {
        this.bot.on('message', async (msg) => {
            if (!this.isAllowedChat(msg.chat.id)) {
                await this.notifyUnauthorizedChat(msg.chat.id);

                return;
            }

            await this.processCommand(msg);
        });
    }

    public addCommand(command: string, handler: {
        desc: string,
        cmd: (msg: TelegramBot.Message) => Promise<void>
    }): void {
        this.commandHandlers[command] = handler;
    }

    public addService(service: BotService): void {
        this.services.push(service);
    }

    public async announceToGroups(groupIds: number[], message: string) {
        try {
            const promises = groupIds.map(async (chatId) => {
                await this.sendSafeMessage(chatId, message, 'GROUP_ANNOUNCE', {
                    parse_mode: 'Markdown',
                });
            });

            await Promise.all(promises);
        } catch (error) {
            Logger.error('ANNOUNCEMENT_ERROR', error, this.config.botName);
            throw error;
        }
    }

    private errorListeners(): void {
        this.bot.on('error', (error) => {
            Logger.error('BOT_ERROR', error, this.config.botName);
            this.emit('error', error);
        });
    }

    private async processCommand(msg: TelegramBot.Message): Promise<void> {
        const text = msg.text?.trim();

        if (!text) {
            Logger.info('EMPTY_MESSAGE', 'Received an empty message.', this.config.botName);

            return;
        }

        // Extract command and bot username (if mentioned)
        const commandMatch = text.match(/^\/(\w+)(?:@(\S+))?/);

        if (!commandMatch) {
            Logger.info('INVALID_COMMAND', `Received an invalid command format: ${text}`, this.config.botName);

            return;
        }

        let [, command, mentionedBot] = commandMatch;

        command = `/${command}`.toLowerCase();

        // Ignore if the command is for another bot
        if (mentionedBot && mentionedBot !== await this.getBotUsername()) {
            Logger.info('COMMAND_FOR_OTHER_BOT', `Command intended for another bot: ${text}`, this.config.botName);

            return;
        }

        // Find and execute the command handler
        const handler = this.commandHandlers[command];

        if (!handler) {
            Logger.info('UNKNOWN_COMMAND', `Unknown command received: ${command}`, this.config.botName);

            return;
        }

        try {
            await handler.cmd(msg);
        } catch (error) {
            Logger.error('COMMAND_EXECUTION_ERROR', `Error executing command: ${command}`, this.config.botName, { error });
            await this.handleCommandError(msg.chat.id, command, error);
        }
    }

    private async handleBotAddedToChat(chat: TelegramBot.Chat): Promise<void> {
        const chatDetails = {
            type: chat.type,
            title: chat.title || 'Untitled Chat',
            id: chat.id,
            username: chat.username || 'N/A',
        };

        Logger.info('BOT_ADDED', `Bot added to chat: ${JSON.stringify(chatDetails)}`, this.config.botName);

        // Send welcome message to the chat
        await this.sendSafeMessage(
            chat.id,
            '👋 Hello! Thanks for adding me to this chat. Use /help to see what I can do.',
            'BOT_ADDED_WELCOME'
        );

        // Notify admin with JSON string
        const adminMessage = JSON.stringify({
            event: 'bot_added',
            chat: chatDetails,
        }, null, 2);

        await this.sendSafeMessage(
            this.config.adminChatId,
            adminMessage,
            'BOT_ADDED_NOTIFICATION'
        );
    }

    private async handleBotRemovedFromChat(chat: TelegramBot.Chat): Promise<void> {
        const chatDetails = {
            type: chat.type,
            title: chat.title || 'Untitled Chat',
            id: chat.id,
            username: chat.username || 'N/A',
        };

        Logger.info('BOT_REMOVED', `Bot removed from chat: ${JSON.stringify(chatDetails)}`, this.config.botName);

        // Notify admin with JSON string
        const adminMessage = JSON.stringify({
            event: 'bot_removed',
            chat: chatDetails,
        }, null, 2);

        await this.sendSafeMessage(
            this.config.adminChatId,
            adminMessage,
            'BOT_REMOVED_NOTIFICATION'
        );
    }

    private async handleCommandError(chatId: number, command: string, error: unknown): Promise<void> {
        Logger.error(`COMMAND_${command.toUpperCase()}`, error, this.config.botName);
        await this.sendSafeMessage(
            chatId,
            '⚠️ An error occurred while processing your request.',
            'COMMAND_ERROR'
        );
    }

    private isAllowedChat(chatId: number): boolean {
        return this.config.chatIds.includes(chatId);
    }

    private async getBotUsername(): Promise<string> {
        if (!this.botUsername) {
            this.botUsername = (await this.bot.getMe()).username;
        }

        return this.botUsername;
    }

    private async notifyUnauthorizedChat(chatId: number): Promise<void> {
        await this.sendSafeMessage(
            chatId,
            '❌ This bot is not allowed in this chat.',
            'UNAUTHORIZED_ACCESS'
        );
    }

    public async sendSafeMessage(
        chatId: number,
        message: string,
        context: string,
        options?: TelegramBot.SendMessageOptions
    ): Promise<void> {
        try {
            await this.bot.sendMessage(chatId, message, options);
            Logger.info(context, `Message sent to ${chatId}`, this.config.botName);
        } catch (_e) {
            try {
                await this.bot.sendMessage(chatId, this.escapeTelegramEntities(message), options);
            } catch (error) {
                Logger.error(context, error, this.config.botName, { message });
            }
        }
    }

    private escapeTelegramEntities(message: string): string {
        const entities = ['*', '_', '[', ']', '`'];
        let escapedMessage = message;

        if (!message) {
            return '';
        }

        entities.forEach((entity) => {
            escapedMessage = escapedMessage.split(entity).join(`\\${entity}`);
        });

        return escapedMessage;
    }
}
