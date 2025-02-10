import { BaseTelegramBotService } from '@/bots/bot.service';
import { DataPipeline } from '@/lib/dataPipeline';
import { Logger } from '@/lib/logger';
import { BotConfig } from '@/lib/types';

function splitMessageAtDelimiter(message: string, delimiter: string = '---', maxLength: number = 4096): string[] {
    if (message.length <= maxLength) {
        return [message]; // No need to split if within the limit
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < message.length) {
        let end = start + maxLength;

        if (end >= message.length) {
            // If the remaining message is shorter than maxLength, add it as the last chunk
            chunks.push(message.slice(start));
            break;
        }

        // Find the last occurrence of the delimiter within the current chunk
        const splitPos = message.lastIndexOf(delimiter, end);

        if (splitPos > start) {
            // Split at the delimiter (include the delimiter in the chunk)
            chunks.push(message.slice(start, splitPos + delimiter.length));
            start = splitPos + delimiter.length;
        } else {
            // If no delimiter is found, force split at maxLength (but this shouldn't happen if the message is properly formatted)
            chunks.push(message.slice(start, end));
            start = end;
        }
    }

    return chunks;
}

export class XBotService extends BaseTelegramBotService {
    constructor(config: BotConfig) {
        super(config);

        this.addCommand('/start', {
            desc: 'Start the bot', cmd: async (msg) => {
                await this.bot.sendMessage(msg.chat.id, 'Welcome! Use /help to see available commands.');
            },
        });

        this.addCommand('/balance', {
            desc: 'Get balance', cmd: async (msg) => {
                await this.bot.sendMessage(msg.chat.id, 'Balance: 1000 INR');
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
                const { data } = await this.generateMessageForTrigger(trigger);

                for (const message of data) {
                    const chunks = splitMessageAtDelimiter(message);

                    for (const chunk of chunks) {
                        await this.announceToGroups(chunk);
                    }
                }

            } catch (error) {
                Logger.error('TRIGGER_ERROR', `Failed to process trigger: ${trigger}`, { error }, this.config.botName);
            }
        }
    }

    private async generateMessageForTrigger(trigger: string): Promise<{ data: string[], options: any, }> {
        switch (trigger) {
            case 'balance':
                return DataPipeline.getPayoutPartnerAlphaBalance();
            case 'pending_txn':
                return DataPipeline.getPayoutPartnerAlphaTransactions();
            default:
                return { data: [`ℹ️ New update: \\${trigger}`], options: {} };
        }
    }
}
