import * as XLSX from 'xlsx';

import { VerifierFactory } from '@/lib/bulk/verifiers/verifierFactory';
import { dbInstance } from '@/lib/db/client';
import { luxon } from '@/lib/localeDate';
import { BulkBot } from '@/lib/telegram/bot-bulk-instance';
import { formatNumber } from '@/lib/utils';

// const verificationCheck =
// File Uniquness,
// Transaction Uniquness
// Amount Uniquness
// Payout count
// success icon ✅
// fail icon ❌

export const postProcessBulkFile = async (repliedMessage: any, ctx: any) => {
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
        const verifier = VerifierFactory.createVerifier('yes_bank_excel');
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

        if (dbResult.isTransactionValid) {
            for (const transaction of result.transactions) {
                const createdAtSql = luxon.fromFormat(transaction.createdAt, 'dd/MM/yyyy').toJSDate();

                const payload = {
                    uuid: transaction.tid,
                    amount: transaction.amount,
                    createdAt: createdAtSql,
                    ifscCode: transaction.ifscCode,
                    accountNumber: transaction.accountNumber,
                    accountHolderName: transaction.accountHolderName,
                    sNo: transaction.sNo,
                    fileName: details.fileName,
                };

                await dbInstance.recordTransaction(payload);
            }
        }

        // Build response message
        const responseMessage = [
            `${dbResult.isFileValid ? '✅' : '❌'} File Name: Unique`,
            `${dbResult.isTransactionValid ? '✅' : '❌'} Duplicate Transactions: ${dbResult.duplicateTransactions.length}`,
            `${result.isTransactionCountValid ? '✅' : '❌'} Transactions: ${result.transactionCount}`,
            `${result.isTotalAmountValid ? '✅' : '❌'} Total Amount: ${formatNumber(result.totalAmount, {
                style: 'currency',
                currency: 'INR',
            })}`,
        ].join('\n');

        await ctx.api.sendMessage(repliedMessage.chat.id,
            '```' + repliedMessage.caption + '```'
            + responseMessage
            + '\n\n'
            + '```Errors\n' + result.errors.join('\n') + '```',
            {
                reply_to_message_id: repliedMessage.message_id,
                parse_mode: 'Markdown',
            });

    } catch (error) {
        console.error('Verification error:', error);
        await ctx.reply('⚠️ Error processing file. Please check the format and try again.');
    }
};

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
