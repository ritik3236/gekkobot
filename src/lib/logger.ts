export class Logger {
    static error(context: string, error: unknown, metadata: Record<string, unknown>, botName: string): void {
        console.error(`[${new Date().toISOString()}] ERROR [${context}] [${botName}]`, error, metadata);
    }

    static info(context: string, message: string, botName: string): void {
        console.info(`[${new Date().toISOString()}] INFO [${context}] [${botName}]`, message);
    }
}

export const logger = new Logger();
