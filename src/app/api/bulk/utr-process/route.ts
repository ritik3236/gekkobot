import { NextResponse } from 'next/server';

import { AuthService } from '@/lib/auth.service';
import { dbInstance } from '@/lib/db/client';
import { BankFileTransaction } from '@/lib/db/schema';
import { utrProcessMsg } from '@/lib/telegram/messageBulider';
import { UTR_CHAT_ID, UtrBot } from '@/lib/telegram/utr-bot-instance';
import { WithdrawInterface } from '@/lib/types';

export async function POST(req: Request): Promise<Response> {
    try {
        const dbTransaction = await dbInstance.getBankFileTransactionByStatus('created');

        const updatedPayouts = [];
        const errors = [];

        await UtrBot.bot.api.sendMessage(UTR_CHAT_ID, `'Total Transactions ${dbTransaction.length} to process'`, { parse_mode: 'Markdown' });

        for (const transaction of dbTransaction) {
            const withdrawals = await AuthService.get('/admin/withdraws', {
                state: ['processing'],
                type: 'fiat',
                with_beneficiary: true,
                rid: transaction.accountNumber,
            }, 'api/v3/peatio');

            const processableWithdraw = [];

            for (const withdraw of withdrawals.data) {
                if (checkWithdrawExistInDb(transaction, withdraw)) {
                    processableWithdraw.push(withdraw);
                }
            }

            if (processableWithdraw.length === 1) {
                const { error } = await getAndSetPayoutRequest({
                    tid: processableWithdraw[0].tid,
                    utr: transaction.utr,
                });

                updatedPayouts.push({
                    tid: processableWithdraw[0].tid,
                    amount: processableWithdraw[0].amount,
                    error: error || 'No error',
                });

                if (error?.length > 0) {
                    const successMsg = utrProcessMsg({ ...transaction, status: '❌ failed' });

                    await UtrBot.bot.api.sendMessage(UTR_CHAT_ID, successMsg, { parse_mode: 'Markdown' });
                    continue;
                }

                const successMsg = utrProcessMsg({ ...transaction, status: '✅ Success' });

                await dbInstance.updateBankFileTransactionStatus(transaction.utr, 'success');
                await UtrBot.bot.api.sendMessage(UTR_CHAT_ID, successMsg, { parse_mode: 'Markdown' });
            } else if (processableWithdraw.length > 1) {
                errors.push(`Multiple withdraws found for Account ${transaction.accountNumber} with amount ${transaction.amount}`);

                const msg = utrProcessMsg({ ...transaction, status: '❌ Multiple withdraws found' });

                await UtrBot.bot.api.sendMessage(UTR_CHAT_ID, msg);
            } else {
                errors.push(`No withdraw found for Account ${transaction.accountNumber} with amount ${transaction.amount}`);

                const msg = utrProcessMsg({ ...transaction, status: '❌ No withdraw found' });

                await dbInstance.updateBankFileTransactionStatus(transaction.utr, 'not_found');
                await UtrBot.bot.api.sendMessage(UTR_CHAT_ID, msg, { parse_mode: 'Markdown' });
            }
        }

        return NextResponse.json({ data: updatedPayouts, errors });

    } catch (e) {
        return NextResponse.json({ error: e || 'Internal Server Error' }, { status: 500 });
    }
}

const checkWithdrawExistInDb = (txn: BankFileTransaction, withdraw: WithdrawInterface) => {
    return +txn.amount === +withdraw.amount
        && txn.accountHolderName === withdraw.beneficiary?.data?.full_name
        && txn.accountNumber === withdraw.beneficiary?.data?.account_number
        && txn.ifscCode === withdraw.beneficiary?.data?.bank_ifsc_code;
};

const getAndSetPayoutRequest = async (payload) => {
    const error = [];
    const payoutRequest = await AuthService.get('/admin/payout_requests', {
        tid: payload.tid,
    }, 'api/v3/peatio');

    if (payoutRequest.data?.length === 1) {
        if (payoutRequest.data[0].state !== 'confirming') {
            const confirm_data = await AuthService.patch(`/admin/payout_requests/${payoutRequest.data[0].id}/action`, {
                id: payoutRequest.data[0].id,
                action: 'confirm',
                remark: 'Accepted by bank',
                comment: 'Confirm action from telegram Bot',
            }, 'api/v3/peatio');

            if (confirm_data.error) {
                error.push('Error confirming payout request: ' + confirm_data.error);
            }
        }

        const success_data = await AuthService.patch(`/admin/payout_requests/${payoutRequest.data[0].id}/action`, {
            id: payoutRequest.data[0].id,
            action: 'success',
            txid: payload.utr,
            comment: 'success action from telegram Bot',
        }, 'api/v3/peatio');

        if (success_data.error) {
            error.push('Error success payout request: ' + success_data.error);
        }
    }

    return { error };
};
