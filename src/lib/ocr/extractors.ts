import { RefundOCRFields } from '@/lib/types';

export const extractOcrFields = (text: string): RefundOCRFields => {
    // Dear Customer,
    // An amount of INR 6,79,040.32 has been credited to your A/C. No. XX0392 on 12-MAR-2025 11:44:50 on account of RTGS-Return-YESBR12025031200013998-Rohit Kumar So Houshila P-CREDIT TO NRI ACCOUNT/R12/CREDIT TO NRI ACC.

    const escapeText = text.replace(/\n/g, ' ').replace(/[\r,]/g, '');

    return {
        amount: escapeText.match(/(?<=of\s(?:INR?|IN)\s)[\d.,\s]+\.\d{2}(?=\shas)/i)?.[0]?.trim()?.replace(/\.(?=.*\.)/g, ''),
        txnDate: escapeText.match(/(?<=on\s).*?(?=\son)/i)?.[0]?.trim().replaceAll('|', ''),
        name: escapeText.match(/YESBR\w+-\s*([^-]+)/i)?.[1]?.trim(),
        refundUtr: escapeText.match(/YESBR\w+/)?.[0],
        eid: escapeText.match(/YESBR\w+/)?.[0],
    };
};
