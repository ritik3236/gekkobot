import { BaseTelegramBotService } from '@/bots/bot.service';
import { BotConfig } from '@/lib/types';

export class YBotService extends BaseTelegramBotService {
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
                await this.bot.sendMessage(msg.chat.id, 'Mezu - Pong! 🏓 ');
            },
        });

        this.addCommand('/balance', {
            desc: 'Get balance', cmd: async (msg) => {
                // const blc = await DataPipeline.getPayoutPartnerAlphaTransactions();

                await this.sendSafeMessage(msg.chat.id,'hello', 'XBOT_BALANCE');
            },
        });

        this.addCommand('/withdraw', {
            desc: 'Withdrawal', cmd: async (msg) => {
                await this.bot.sendMessage(msg.chat.id, 'Withdrawal: 1000 INR');
            },
        });

        this.addCommand('/deposit', {
            desc: 'Deposit', cmd: async (msg) => {
                await this.bot.sendMessage(msg.chat.id, 'Deposit: 1000 INR');
            },
        });

        this.addCommand('/transfer', {
            desc: 'Transfer', cmd: async (msg) => {
                await this.bot.sendMessage(msg.chat.id, 'Transfer: 1000 INR');
            },
        });
    }
}
