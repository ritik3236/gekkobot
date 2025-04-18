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

export interface BulkPayoutInterface {
    id: string;
    state: string;
    creator_uid: string;
    payment_gateway_id: string;
    file_format: string;
    payout_count: number | null;
    total_amount: number | null;
    max_sum_amount: number | null;
    downloadable: boolean;
    created_at: string;
    'bulk_payout_download_logs': {
        'id': string,
        'bulk_payout_id': string,
        'member_id': number,
        'created_at': string;
        'updated_at': string;
        'downloaded_at': string;
    }[];
}

export interface BulkPayoutResponse {
    data: BulkPayoutInterface;
    file_url: string;
}

export interface TransactionInterface {
    tid: string;
    fileName: string;
    sNo: number;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    amount: number;
    createdAt: string;
}

export interface BulkPayoutVerifierInterface {
    validate(
        rows: any[][],
        expectedPayoutCount: number | null,
        expectedTotalAmount: number | null
    ): {
        isValid: boolean;
        transactionCount: number;
        totalAmount: number;
        errors: string[];
        transactions: TransactionInterface[];
    };
}
