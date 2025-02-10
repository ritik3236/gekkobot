export class Logger {
    static error(context: string, message: unknown, botName?: string, metadata?: Record<string, unknown>): void {
        console.error(`[${new Date().toISOString()}] ERROR [${context}] [${botName}]`, message, metadata);
    }

    static warn(context: string, message: string, botName?: string, metadata?: Record<string, unknown>): void {
        console.warn(`[${new Date().toISOString()}] WARN [${context}] [${botName}]`, message, metadata);
    }

    static info(context: string, message: string, botName?: string, metadata?: Record<string, unknown>): void {
        console.info(`[${new Date().toISOString()}] INFO [${context}] [${botName}]`, message, metadata);
    }

    static log(context: string, message: string, botName?: string, metadata?: Record<string, unknown>): void {
        console.info(`[${new Date().toISOString()}] INFO [${context}] [${botName}]`, message, metadata);
    }
}
