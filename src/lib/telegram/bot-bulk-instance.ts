import * as XLSX from 'xlsx';

import { VerifierFactory } from '@/lib/bulk';
import { dbInstance } from '@/lib/db/client';
import { TelegramBot } from '@/lib/telegram/bot';
import { formatNumber } from '@/lib/utils';

export const BulkBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_BULK || '');

BulkBot.bot.init();

BulkBot.bot.command('start', async (ctx) => {
    await ctx.reply('Welcome to the OCR Bot! Send me an image and I will process it for you.');
});

BulkBot.bot.command('help', async (ctx) => {
    await ctx.reply('Available commands:\n/start - Start the bot\n/help - Get help\n/ping - Ping the bot');
});

BulkBot.bot.command('ping', async (ctx) => {
    await ctx.reply('Pong!');
});

// const verificationCheck =
// File Uniquness,
// Transaction Uniquness
// Amount Uniquness
// Payout count
// success icon ✅
// fail icon ❌

// check for reply of a msg
BulkBot.bot.on('message', async (ctx) => {
    if (ctx.msg.reply_to_message && ctx.msg.text?.toLowerCase() === 'verify') {
        const repliedMessage = ctx.msg.reply_to_message;

        // Validate replied message contains document and caption
        if (!repliedMessage.document || !repliedMessage.caption) {
            await ctx.reply('❌ Please reply to a valid bulk payout file');

            return;
        }

        try {
            // Parse metadata from caption
            const details = parseCaption(repliedMessage.caption);

            console.log(details);

            if (!details.valid) {
                await ctx.reply('❌ Invalid file metadata in caption');

                return;
            }

            // Get file buffer from Telegram
            const fileUrl = await BulkBot.getFileUrl(repliedMessage.document.file_id);
            const response = await fetch(fileUrl);

            if (!response.ok) throw new Error('Failed to download file');
            const arrayBuffer = await response.arrayBuffer();

            // Process Excel data
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            // Run verification
            const verifier = VerifierFactory.createVerifier(details.fileFormat!);
            const result = verifier.validate(
                rows,
                details.transactionCount!,
                details.totalAmount!
            );

            //Run db verification
            const dbVerifier = VerifierFactory.createDbVerifier(details.fileName!, result.transactions);
            const dbResult = await dbVerifier.validate();

            console.log('dbResult', dbResult);

            if (!dbResult.isTransactionValid || !dbResult.isFileValid) {
                result.errors.push(...dbResult.errors);
            }

            if (dbResult.isFileValid) {
                await dbInstance.createFileSummary({
                    duplicateCount: String(dbResult.duplicateTransactions),
                    fileName: details.fileName!,
                    totalAmount: String(result.totalAmount),
                    transactionCount: String(result.transactionCount),
                });
            }

            // Build response message
            const responseMessage = [
                `${dbResult.isFileValid ? '✅' : '❌'} File Name: Unique`,
                `${dbResult.isTransactionValid ? '✅' : '❌'} Duplicate Transactions: ${dbResult.duplicateTransactions.length}`,
                `${result.isTransactionCountValid ? '✅' : '❌'} New Transactions: ${result.transactionCount}`,
                `${result.isTotalAmountValid ? '✅' : '❌'} Total Amount: ${formatNumber(result.totalAmount, {
                    style: 'currency',
                    currency: 'INR',
                })}`,
                ...(result.errors.length > 0 ? ['```' + '\nErrors:', ...result.errors + '```'] : []),
            ].join('\n');

            await ctx.api.sendMessage(repliedMessage.chat.id, '```' + repliedMessage.caption + '```' + responseMessage, {
                reply_to_message_id: repliedMessage.message_id,
                parse_mode: 'Markdown',
            });

        } catch (error) {
            console.error('Verification error:', error);
            await ctx.reply('⚠️ Error processing file. Please check the format and try again.');
        }
    }
});

BulkBot.bot.on('my_chat_member', (ctx) => {
    const oldStatus = ctx.update.my_chat_member.old_chat_member.status;
    const newStatus = ctx.update.my_chat_member.new_chat_member.status;
    const chat = ctx.chat;

    if (oldStatus === 'left' && newStatus === 'member') {
        console.log(`✅ Bot added to group: ${chat.title}`);
    } else if (oldStatus === 'member' && newStatus === 'left') {
        console.log(`❌ Bot removed from group: ${chat.title}`);
    } else {
        console.log(`Bot status changed in group: ${chat.title} | ${oldStatus} → ${newStatus}`);
    }
});

interface FileDetails {
    valid: boolean;
    fileName?: string;
    fileFormat?: string;
    transactionCount?: number;
    totalAmount?: number;
}

// Helper function to parse caption metadata
function parseCaption(caption: string): FileDetails {
    const result: FileDetails = { valid: false };
    const patterns = {
        fileName: /File Name:\s*(.+)/i,
        fileFormat: /File Format:\s*(.+)/i,
        transactionCount: /Transaction Count:\s*(\d+)/i,
        totalAmount: /Total Amount:\s*₹?([\d,.]+)/i,
    };

    try {
        result.fileName = caption.match(patterns.fileName)?.[1]?.toLowerCase() + '.xlsx';
        result.fileFormat = caption.match(patterns.fileFormat)?.[1]?.toLowerCase();
        result.transactionCount = parseInt(caption.match(patterns.transactionCount)?.[1] || '');
        result.totalAmount = +caption.match(patterns.totalAmount)?.[1]?.replaceAll(',', '');

        result.valid = !!result.fileFormat &&
            !isNaN(result.transactionCount) &&
            !isNaN(result.totalAmount);

    } catch (error) {
        console.error('Caption parsing error:', error);
    }

    return result;
}
