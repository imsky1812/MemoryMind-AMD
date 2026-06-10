// frontend/lib/api.ts

import axios from 'axios';
import { QueryResponse, IngestResponse, HealthResponse, Source } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
});

// ── Health ────────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get('/health');
  return data;
}

// ── Sources ───────────────────────────────────────────────────────────────────

export async function getSources(userId: string): Promise<Source[]> {
  const { data } = await api.get(`/sources/${userId}`);
  return data.sources || [];
}

export async function deleteSource(userId: string, filename: string): Promise<void> {
  await api.delete(`/sources/${userId}/${encodeURIComponent(filename)}`);
}

// ── Ingest ────────────────────────────────────────────────────────────────────

export async function ingestFile(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void
): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);

  const { data } = await api.post('/ingest', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });

  return data;
}

// ── Query (X402 gated) ────────────────────────────────────────────────────────

export async function queryBrain(
  question: string,
  userId: string,
  paymentProof: string,
  sourceFilter?: string
): Promise<QueryResponse> {
  const formData = new FormData();
  formData.append('question', question);
  formData.append('user_id', userId);
  formData.append('top_k', '5');
  if (sourceFilter) {
    formData.append('source_filter', sourceFilter);
  }

  const { data } = await api.post('/query', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-PAYMENT': paymentProof,
    },
  });

  return data;
}

// ── Payment info (public) ─────────────────────────────────────────────────────

export async function getPaymentInfo(): Promise<{ endpoint: string; payment_required: any }> {
  const { data } = await api.get('/payment-info');
  return data;
}
