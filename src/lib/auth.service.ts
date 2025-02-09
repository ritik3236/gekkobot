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
            let url = new URL(`${process.env.SERVER_HOST}/api/v2/peatio${pathname}`).toString();

            if (payload) {
                url += buildQueryString(payload);
            }

            const req_headers = new Headers(this.getAuthHeaders());

            Logger.info('API', `Fetching data from ${url}`, 'API');

            const res = await fetch(url.toString(), { method: 'GET', headers: req_headers });

            if (!res.ok) throw new Error(`Request failed: ${res.statusText}`);

            const data = await res.json();

            return { data, headers: { total: res.headers.get('Total') }, errror: null };
        } catch (error) {
            console.error('API Error:', error);

            return { error: '⚠️ Error fetching data.', data: null, headers: null };
        }
    }
}
