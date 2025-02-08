import { MezuService } from '@/bots/mezuBot';
import { PayoutXService } from '@/bots/xbot';
import { BotConfig } from '@/lib/types';

export function initializeBots(botConfigs: BotConfig[]): void {
    const bot1 = new PayoutXService(botConfigs[0]);
    const bot2 = new MezuService(botConfigs[1]);

    bot1.initialize();
    bot2.initialize();
}
