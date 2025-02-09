import CryptoJS from 'crypto-js';

import { Logger } from '@/lib/logger';
import { buildQueryString } from '@/lib/utils';

export class AuthService {
    static getAuthHeaders() {
        const nonce = Date.now().toString();
        const accessKey = process.env.SERVER_ACCESS_KEY;
        const secretKey = process.env.SERVER_SECRET_KEY;

        if (!accessKey || !secretKey) throw new Error('Missing API keys');

        const sigString = nonce + accessKey;
        const signature = CryptoJS.HmacSHA256(sigString, secretKey).toString();

        return {
            'X-Auth-Apikey': accessKey,
            'X-Auth-Nonce': nonce,
            'X-Auth-Signature': signature,

            'Content-Type': 'application/json',
        };
    }

    static async get(pathname: string, payload?: Record<string, any>) {
        try {
            let url = new URL(`${process.env.SERVER_HOST}/api/v2/peatio${pathname}?`).toString();

            if (payload) {
                url += buildQueryString(payload);
            }

            Logger.info('API Request:', url, 'GET');

            const headers = this.getAuthHeaders();
            const response = await fetch(url.toString(), { method: 'GET', headers });

            Logger.info('API Request:', url, 'GET');

            if (!response.ok) throw new Error(`Request failed: ${response.statusText}`);

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);

            return { error: '⚠️ Error fetching data.' };
        }
    }
}
