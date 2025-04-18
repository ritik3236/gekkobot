import { BulkPayoutVerifierInterface } from '@/lib/types';

import { DemoBankExcelVerifier } from './demoBankExcelVerifier';
import { GeneralExcelVerifier } from './generalExcelVerifier';
import { YesBankExcelVerifier } from './yesBankExcelVerifier';

export class VerifierFactory {
    static createVerifier(fileFormat: string): BulkPayoutVerifierInterface {
        const format = fileFormat.toLowerCase();

        if (format === 'yesbankexcel' || format === 'yes_bank_excel') {
            return new YesBankExcelVerifier();
        }
        if (format === 'generalexcel' || format === 'general_excel') {
            return new GeneralExcelVerifier();
        }
        if (format === 'demobankexcel' || format === 'demo_bank_excel') {
            return new DemoBankExcelVerifier();
        }

        throw new Error(`Unsupported file format: ${fileFormat}`);
    }
}
