import { BaseTelegramBotService } from '@/bots/bot.service';
import { Logger } from '@/lib/logger';
import { BotConfig } from '@/lib/types';

export class XBotService extends BaseTelegramBotService {
    constructor(config: BotConfig) {
        super(config);

        this.addCommand('/start', {
            desc: 'Start the bot', cmd: async (msg) => {
                await this.bot.sendMessage(msg.chat.id, 'Welcome! Use /help to see available commands.');
            },
        });

        this.addCommand('/help', {
            desc: 'Get help', cmd: async (msg) => {
                const commands = Object
                    .entries(this.commandHandlers)
                    .map(([command, { desc }]) => `${command} - ${desc}`).join('\n');

                await this.bot.sendMessage(msg.chat.id, `Available commands:\n${commands}`);
            },
        });

        this.addCommand('/ping', {
            desc: 'Ping the bot', cmd: async (msg) => {
                await this.bot.sendMessage(msg.chat.id, 'Pong!');
            },
        });
    }

    public async handleCustomTriggers(triggers: string[]): Promise<void> {
        for (const trigger of triggers) {
            try {
                const message = await this.generateMessageForTrigger(trigger);

                await this.announceToGroups(message);
            } catch (error) {
                Logger.error('TRIGGER_ERROR', `Failed to process trigger: ${trigger}`, { error }, this.config.botName);
            }
        }
    }

    private async generateMessageForTrigger(trigger: string): Promise<string> {
        switch (trigger) {
            case 'updates':
                return '💰 Account balance update:\n\n- Total balance: $1000\n- Available: $800\n- In use: $200';
            case 'system':
                return '🚨 Critical system alert!\n\nPlease check dashboard immediately.';
            default:
                return `ℹ️ New update: ${trigger}`;
        }
    }
}
