import { RefundOCRFields } from '@/lib/types';

export const extractOcrFields = (text: string): RefundOCRFields => {
    // Dear Customer,
    // An amount of INR 6,79,040.32 has been credited to your A/C. No. XX0392 on 12-MAR-2025 11:44:50 on account of RTGS-Return-YESBR12025031200013998-Rohit Kumar So Houshila P-CREDIT TO NRI ACCOUNT/R12/CREDIT TO NRI ACC.

    //TODO: Remove temp solution

    if (!text || !text.includes('credit')) {
        return {
            amount: '',
            txnDate: '',
            name: '',
            refundUtr: '',
            uuid: '',
        };
    }

    const escapeText = text.replace(/\n/g, ' ').replace(/[\r,]/g, '');

    console.log('======', text, escapeText, '=====');

    return {
        amount: escapeText.match(/(?<=of\s(?:INR?|IN)\s)[\d.,\s]+\.\d{2}(?=\shas)/i)?.[0]?.trim()?.replace(/\.(?=.*\.)/g, ''),
        txnDate: escapeText.match(/(?<=on\s).*?(?=\son)/i)?.[0]?.trim().replaceAll('|', ''),
        name: escapeText.match(/YES\w+-\s*([^-]+)/i)?.[1]?.trim()?.toUpperCase(),
        refundUtr: escapeText.match(/YES\w+/)?.[0],
        uuid: escapeText.match(/YES\w+/)?.[0],
    };
};
