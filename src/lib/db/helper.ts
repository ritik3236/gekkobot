import { eq, or, sql, SQL } from 'drizzle-orm';

import * as schema from '@/lib/db/schema';
import { luxon } from '@/lib/localeDate';

export function prepareTransactionQuery(
    name: string,
    amount: string,
    txnDate: Date
): {
        nameCondition: SQL<unknown>;
        amountCondition: SQL<unknown>;
        dateCondition: SQL<unknown>;
    } {
    if (!name?.trim() || !amount || !txnDate) {
        throw new Error('Name, Amount, and Date are required');
    }

    const date = luxon.fromJSDate(txnDate);

    const previousDate = date.minus({ days: 1 });
    const datesToCheck = [date, previousDate];
    const patterns = datesToCheck.flatMap((dt) => {
        const day = dt.day;
        const month = dt.toFormat('MMM').toUpperCase();

        return [
            `${day}${month}`,
            `${String(day).padStart(2, '0')}${month}`,
        ];
    });
    const uniquePatterns = [...new Set(patterns)];

    const nameCondition = sql`UPPER(
    ${schema.transactions.accountHolderName}
    )
    =
    ${name.toUpperCase()}`;
    const amountCondition = eq(schema.transactions.amount, amount);
    const dateCondition = or(
        ...uniquePatterns.map((pattern) => sql`${schema.transactions.fileName}
        LIKE
        ${`%${pattern}%`}`)
    );

    return { nameCondition, amountCondition, dateCondition };
}
