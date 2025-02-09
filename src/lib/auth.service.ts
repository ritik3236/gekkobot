import CryptoJS from 'crypto-js';

import { buildQueryString } from '@/lib/utils';

export class AuthService {
    static getAuthHeaders() {
        const nonce = Date.now().toString();
        const accessKey = process.env.ACCESS_KEY;
        const secretKey = process.env.SECRET_KEY;

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
            let url = new URL(`${process.env.HOST}/api/v2/peatio${pathname}?`).toString();

            if (payload) {
                url += buildQueryString(payload);
            }

            const headers = new Headers(this.getAuthHeaders());
            const response = await fetch(url.toString(), { method: 'GET', headers });

            if (!response.ok) throw new Error(`Request failed: ${response.statusText}`);

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);

            return { error: '⚠️ Error fetching data.' };
        }
    }
}
