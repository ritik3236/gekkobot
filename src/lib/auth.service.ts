// src/lib/auth.service.ts
import CryptoJS from 'crypto-js';

import { Logger } from '@/lib/logger';
import { buildQueryString } from '@/lib/utils';

export class AuthService {
    private static API_TIMEOUT = 5000; // 5 seconds timeout

    static getAuthHeaders() {
        const nonce = Date.now().toString();
        const accessKey = process.env.SERVER_ACCESS_KEY;
        const secretKey = process.env.SERVER_SECRET_KEY;

        if (!accessKey || !secretKey) {
            throw new Error('Missing API keys - check server configuration');
        }

        const sigString = nonce + accessKey;
        const signature = CryptoJS.HmacSHA256(sigString, secretKey).toString();

        return {
            'Content-Type': 'application/json',
            'X-Auth-Apikey': accessKey,
            'X-Auth-Nonce': nonce,
            'X-Auth-Signature': signature,
        };
    }

    static async get(pathname: string, payload?: Record<string, any>) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.API_TIMEOUT);

        try {
            const url = new URL(`${process.env.SERVER_HOST}/api/v2/peatio${pathname}`);

            if (payload) {
                url.search = buildQueryString(payload);
            }

            Logger.info('API Request:', `GET ${url.toString()}`, 'API');

            const headers = this.getAuthHeaders();
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers,
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`API responded with status ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeout);

            if (error.name === 'AbortError') {
                Logger.error(`API Timeout after ${this.API_TIMEOUT}ms:`, { pathname }, {}, 'API');

                return { error: '⚠️ Request timed out - please try again later' };
            }

            Logger.error('API Request', 'Failed to fetch data', {
                pathname,
                error: error.message,
                stack: error.stack,
            }, 'API');

            return {
                error: error.message.includes('timed out')
                    ? '⚠️ Service unavailable - please try again later'
                    : '⚠️ Error fetching data - contact support',
            };
        }
    }
}
