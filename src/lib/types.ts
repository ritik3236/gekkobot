export interface BotService {
    start(): void;
}

export interface BotConfig {
    botName: string;
    adminChatId: number;
    token: string;
    webhookUrl?: string;
    polling?: boolean;
    chatIds: number[];
}

export interface PartnerBalance {
    balance: string;
    currency: string;
    id: string;
    locked: string;
    timestamp: number;
}

export interface Payout {
    id: string;
    uid: string;
    email: string;
    amount: number;
    currency_id: string;
    blockchain_id: string;
    withdraw_reference_type: string;
    withdraw_reference_id: string;
    gateway_reference_type: string;
    gateway_reference_id: string;
    gateway_reference_name: string;
    tid: string;
    txid: string;
    remote_id: string;
    state: string;
    retry_attempt: number;
    remark: string;
    log_data: string;
    metadata: null;
    created_at: string;
    updated_at: string;
}

export interface RefundOCRFields {
    uuid: string;
    txnDate?: string;
    name?: string;
    amount?: string;
    refundUtr?: string;
}

export interface RefundRequest {
    ocrText: string;
    uuid: string;
    txnDate: string;
    name: string;
    amount: string;
    refundUtr: string;
    fileUrl: string;
}
