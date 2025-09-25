import type { Chicken, FeedLog, TagMap } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5174';

async function request<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json() as Promise<T>;
  return null;
}

export const api: {
  // Chickens
  listChickens: () => Promise<Chicken[]>;
  addChicken: (data: Partial<Chicken>) => Promise<Chicken>;
  updateChicken: (id: string, data: Partial<Chicken>) => Promise<Chicken>;
  deleteChicken: (id: string) => Promise<null>;
  // Feed logs
  listFeedLogs: (chickenId: string) => Promise<FeedLog[]>;
  addFeedLog: (chickenId: string, data: Partial<FeedLog>) => Promise<FeedLog>;
  updateFeedLog: (chickenId: string, logId: string, data: Partial<FeedLog>) => Promise<FeedLog>;
  deleteFeedLog: (chickenId: string, logId: string) => Promise<null>;
  // Tags
  getAllTags: () => Promise<TagMap>;
} = {
  // Chickens
  listChickens: () => request<Chicken[]>('/chickens'),
  addChicken: (data) => request<Chicken>('/chickens', { method: 'POST', body: JSON.stringify(data) }) as Promise<Chicken>,
  updateChicken: (id, data) => request<Chicken>(`/chickens/${id}`, { method: 'PATCH', body: JSON.stringify(data) }) as Promise<Chicken>,
  deleteChicken: (id) => request<null>(`/chickens/${id}`, { method: 'DELETE' }) as Promise<null>,

  // Feed logs
  listFeedLogs: (chickenId) => request<FeedLog[]>(`/chickens/${chickenId}/feed-logs`) as Promise<FeedLog[]>,
  addFeedLog: (chickenId, data) => request<FeedLog>(`/chickens/${chickenId}/feed-logs`, { method: 'POST', body: JSON.stringify(data) }) as Promise<FeedLog>,
  updateFeedLog: (chickenId, logId, data) => request<FeedLog>(`/chickens/${chickenId}/feed-logs/${logId}`, { method: 'PATCH', body: JSON.stringify(data) }) as Promise<FeedLog>,
  deleteFeedLog: (chickenId, logId) => request<null>(`/chickens/${chickenId}/feed-logs/${logId}`, { method: 'DELETE' }) as Promise<null>,

  // Tags
  getAllTags: () => request<TagMap>('/tags') as Promise<TagMap>,
};

export type { Chicken, FeedLog, TagMap };
