import { dbInstance } from '@/lib/db/client';
import { RefundRequest } from '@/lib/types';

export const recordRefund = async (payload: RefundRequest) => {
    try {
        const { ocrText, uniqueId, txnDate, name, amount, refundUtr, fileUrl } = payload;

        console.log('Recording refund:', { uniqueId, ocrText, txnDate, name, amount, refundUtr, fileUrl });

        await dbInstance.recordRefund(payload);

    } catch (error) {
        console.error('Error recording refund:', error);
        throw error;
    }
};
