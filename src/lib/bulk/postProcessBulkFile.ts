// bulkProcessor.ts
import { VerifierFactory } from '@/lib/bulk/verifiers/verifierFactory';
import { dbInstance } from '@/lib/db/client';
import { processExcelFile } from '@/lib/file_helper';
import { luxon } from '@/lib/localeDate';
import { BulkBot } from '@/lib/telegram/bot-bulk-instance';
import { FileDetails, VerificationResult } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

const FILE_VALIDATION_MESSAGES = {
    FILE_UNIQUE: '✅ File Name: Unique',
    FILE_DUPLICATE: '❌ File Name: Duplicate',
    TRANSACTION_UNIQUE: '✅ Duplicate Transactions',
    TRANSACTION_DUPLICATE: (count: number) => `❌ Duplicate Transactions: ${count}`,
    TRANSACTION_COUNT_VALID: (count: number) => `✅ Transactions: ${count}`,
    TRANSACTION_COUNT_INVALID: (count: number) => `❌ Transactions: ${count}`,
    AMOUNT_VALID: (amount: string) => `✅ Total Amount: ${amount}`,
    AMOUNT_INVALID: (amount: string) => `❌ Total Amount: ${amount}`,
};

export const postProcessBulkFile = async (repliedMessage: any, ctx: any) => {
    if (!repliedMessage.document?.file_id || !repliedMessage.caption) {
        return ctx.reply('❌ Please reply to a valid bulk payout file');
    }

    try {
        const details = parseCaption(repliedMessage.caption);

        if (!details.valid) return ctx.reply('❌ Invalid file metadata in caption');

        const fileUrl = await BulkBot.getFileUrl(repliedMessage.document.file_id);
        const { transactions } = await processExcelFile(fileUrl);
        const verificationResult = verifyData(details, transactions);
        const dbResult = await processDatabaseOperations(details, verificationResult);

        const responseMessage = buildValidationMessage(details, verificationResult, dbResult, repliedMessage.caption);

        await sendFinalResponse(ctx, repliedMessage, responseMessage);

    } catch (error) {
        console.error('Bulk processing error:', error);
        await ctx.reply('⚠️ Error processing file. Please check the format and try again.');
    }
};

function verifyData(details: FileDetails, rows: any[]) {
    const verifier = VerifierFactory.createVerifier(getFileType(rows));

    return verifier.validate(
        rows,
        details.transactionCount!,
        details.totalAmount!
    );
}

function getFileType(rows: any[][]) {
    const tags = new Set(rows.map((row) => row[0]));

    if (tags.has('H') && tags.has('F')) return 'yes_bank_excel';
}

async function processDatabaseOperations(details: FileDetails, result: any) {
    const dbVerifier = VerifierFactory.createDbVerifier(details.fileName!, result.transactions);
    const dbResult = await dbVerifier.validate();

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
        await bulkInsertTransactions(details, result.transactions);
    }

    return dbResult;
}

async function bulkInsertTransactions(details: FileDetails, transactions: any[]) {
    for (const transaction of transactions) {
        const payload = {
            uuid: transaction.tid,
            amount: transaction.amount,
            createdAt: luxon.fromFormat(transaction.createdAt, 'dd/MM/yyyy').toJSDate(),
            ifscCode: transaction.ifscCode,
            accountNumber: transaction.accountNumber,
            accountHolderName: transaction.accountHolderName,
            sNo: transaction.sNo,
            fileName: details.fileName,
        };

        await dbInstance.recordTransaction(payload);
    }
}

function buildValidationMessage(details: FileDetails, result: VerificationResult, dbResult: any, caption: string) {
    const totalAmount = formatNumber(result.totalAmount, {
        style: 'currency',
        currency: 'INR',
    });

    const messages = [
        dbResult.isFileValid ? FILE_VALIDATION_MESSAGES.FILE_UNIQUE : FILE_VALIDATION_MESSAGES.FILE_DUPLICATE,
        dbResult.isTransactionValid
            ? FILE_VALIDATION_MESSAGES.TRANSACTION_UNIQUE
            : FILE_VALIDATION_MESSAGES.TRANSACTION_DUPLICATE(dbResult.duplicateTransactions.length),
        result.isTransactionCountValid
            ? FILE_VALIDATION_MESSAGES.TRANSACTION_COUNT_VALID(result.transactionCount)
            : FILE_VALIDATION_MESSAGES.TRANSACTION_COUNT_INVALID(result.transactionCount),
        result.isTotalAmountValid
            ? FILE_VALIDATION_MESSAGES.AMOUNT_VALID(String(totalAmount))
            : FILE_VALIDATION_MESSAGES.AMOUNT_INVALID(String(totalAmount)),
    ];

    return [
        '```' + caption + '```',
        ...messages,
        '\n```Errors\n' + result.errors.join('\n') + '```',
    ].join('\n');
}

async function sendFinalResponse(ctx: any, repliedMessage: any, message: string) {
    await ctx.api.sendMessage(
        repliedMessage.chat.id,
        message,
        {
            reply_to_message_id: repliedMessage.message_id,
            parse_mode: 'Markdown',
        }
    );
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

        console.log(result);
    } catch (error) {
        console.error('Caption parsing error:', error);
    }

    return result;
}
