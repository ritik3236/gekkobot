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

export interface Beneficiary {
    id: number;
    currency: string;
    blockchain_key: string;
    type: string;
    explorer_address: string;
    protocol: string;
    name: string;
    data: {
        bank_ifsc_code: string;
        full_name: string;
        account_number: string;
        aml_data: {
            error: string;
        };
    };
    description: string;
    state: string;
    sent_at: string;
    created_at: string;
    updated_at: string;
    uid: string;
    email: string;
    metadata: null;
}

export interface Withdrawal {
    id: string;
    amount: number;
    email: string;
    currency: string;
    state: string;
    tid: string;
    created_at: string;
    updated_at: string;
    completed_at: string;
    txid: string;
    note: string;
    remark: string;
    protocol: string;
    fee: string;
    sum: string;
    user_ip: string;
    metadata: {
        user_ip: string;
    };
    client_reference_id: string;
    beneficiary_id: string;
    beneficiary: Beneficiary;
}

export interface Payouts {
    id: string;
   uid: string;
   email: string;
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