// src/lib/auth.service.ts
import CryptoJS from 'crypto-js';

import { Logger } from '@/lib/logger';
import { buildQueryString } from '@/lib/utils';

// Track pending requests
const pendingRequests = new Map<string, AbortController>();

export class AuthService {
    private static API_TIMEOUT = 10000; // 10 seconds timeout

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
            'X-Auth-Apikey': accessKey,
            'X-Auth-Nonce': nonce,
            'X-Auth-Signature': signature,
            'Content-Type': 'application/json',
        };
    }

    static async get(pathname: string, payload?: Record<string, any>) {
        const requestKey = `${pathname}-${JSON.stringify(payload)}`;
        const existingRequest = pendingRequests.get(requestKey);

        // Cancel previous request if still pending
        if (existingRequest) {
            existingRequest.abort();
            pendingRequests.delete(requestKey);
        }

        const controller = new AbortController();

        pendingRequests.set(requestKey, controller);

        const timeout = setTimeout(() => {
            controller.abort();
            pendingRequests.delete(requestKey);
        }, this.API_TIMEOUT);

        try {
            const url = new URL(`${process.env.SERVER_HOST}/api/v2/peatio${pathname}`);

            if (payload) {
                url.search = buildQueryString(payload);
            }

            Logger.info('API Request:', `GET ${url.toString()}`);

            const headers = this.getAuthHeaders();
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers,
                signal: controller.signal,
            });

            clearTimeout(timeout);
            pendingRequests.delete(requestKey);

            if (!response.ok) {
                throw new Error(`API responded with status ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeout);
            pendingRequests.delete(requestKey);

            if (error.name === 'AbortError') {
                Logger.error(`API Timeout after ${this.API_TIMEOUT}ms:`, { pathname });

                return { error: '⚠️ Request timed out - please try again later' };
            }

            Logger.error('API Request Failed:', {
                pathname,
                error: error.message,
                stack: error.stack,
            });

            return {
                error: error.message.includes('timed out')
                    ? '⚠️ Service unavailable - please try again later'
                    : '⚠️ Error fetching data - contact support',
            };
        }
    }
}
