// frontend/types/index.ts

export type Source = string | {
  filename: string;
  chunks?: number;
  uploaded_at?: string;
};
export interface DuplicateResponse {
  duplicate: true;
  filename: string;
}

export interface QueryResponse {
  question: string;
  answer: string;
  sources: string[];
  chunks_used: number;
  user_id: string;
  payment: {
    amount: string;
    asset: string;
    network: string;
    verified: boolean;
    tx_hash?: string;
  };
}

export interface IngestResponse {
  status: string;
  filename: string;
  chunks_stored: number;
  user_id: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  payment: {
    enabled: boolean;
    price: string;
    network: string;
    asset: string;
    payTo: string;
  };
}

export interface PaymentReceipt {
  txHash: string;
  amount: string;
  asset: string;
  network: string;
  explorerUrl: string;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  receipt?: PaymentReceipt;
  isLoading?: boolean;
}

export interface DashboardStats {
  totalSources: number;
  totalQueries: number;
  totalEarned: string; // USDC amount as string
}