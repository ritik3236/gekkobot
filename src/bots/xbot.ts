import { BaseTelegramBotService } from '@/bots/bot.service';
import { DataPipeline } from '@/lib/dataPipeline';
import { luxon } from '@/lib/localeDate';
import { Logger } from '@/lib/logger';
import { BotConfig } from '@/lib/types';
import { escapeTelegramEntities } from '@/lib/utils';

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

        this.addCommand('/help', {
            desc: 'Get help', cmd: async (msg) => {
                const commands = Object
                    .entries(this.commandHandlers)
                    .map(([command, { desc }]) => `${command} - ${desc}`).join('\n');

                await this.sendSafeMessage(msg.chat.id, `Available commands:\n${commands}`, 'XBOT_HELP');
            },
        });

        this.addCommand('/ping', {
            desc: 'Ping the bot', cmd: async (msg) => {
                await this.sendSafeMessage(msg.chat.id, 'Pong!', 'XBOT_PING');
            },
        });
    }

    public async handleBroadcastTriggers(payload: {
        broadcast_triggers: string[],
        broadcast_groups: number[]
    }): Promise<string> {
        const errors: string[] = [];

        for (const trigger of payload.broadcast_triggers) {
            try {
                const { data } = await this.handleTrigger(trigger);

                const chunks = splitMessageAtDelimiter(data.join(escapeTelegramEntities('\n---------- +++ ---------- \n')));

                for (const chunk of chunks) {
                    errors.push(...await this.announceToGroups(payload.broadcast_groups, chunk));
                }

            } catch (error) {
                Logger.error('TRIGGER_ERROR', `Failed to process trigger: ${trigger}`, this.config.botName, { error });
            }
        }

        return errors.join('\n');
    }

    private async handleTrigger(trigger: string): Promise<{ data: string[], options?: any, }> {
        switch (trigger) {
            case 'balance':
                return DataPipeline.getAlphaBalance();
            case 'pending_txn':
                const now = luxon.now().setZone('Asia/Kolkata');
                const twelveHoursAgo = now.minus({ hours: 12 });

                return DataPipeline.getAlphaTransactions({
                    state: 'confirming',
                    to: twelveHoursAgo.toISO(),
                });
            case 'failed_txn':
                return DataPipeline.getAlphaTransactions({ state: 'failed' });
            default:
                return { data: [`ℹ️ New update: \\${trigger}`], options: {} };
        }
    }
}
