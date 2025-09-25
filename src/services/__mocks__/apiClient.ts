import { vi } from 'vitest';
import type { Chicken, FeedLog, TagMap } from '@/types';

export const api = {
  // Chickens
  listChickens: vi.fn<[], Promise<Chicken[]>>().mockResolvedValue([]),
  addChicken: vi.fn<[Partial<Chicken>], Promise<Chicken>>().mockImplementation(async (data) => ({ id: 'test-id', ...(data as any) })),
  updateChicken: vi.fn<[string, Partial<Chicken>], Promise<Chicken>>().mockImplementation(async (id, updates) => ({ id, ...(updates as any) })),
  deleteChicken: vi.fn<[string], Promise<null>>().mockResolvedValue(null),
  // Feed logs
  listFeedLogs: vi.fn<[string], Promise<FeedLog[]>>().mockResolvedValue([]),
  addFeedLog: vi.fn<[string, Partial<FeedLog>], Promise<FeedLog>>().mockImplementation(async (chickenId, entry) => ({ id: 'log-id', chickenId, ...(entry as any) } as FeedLog)),
  updateFeedLog: vi.fn<[string, string, Partial<FeedLog>], Promise<FeedLog>>().mockImplementation(async (_id, _logId, updates) => ({ id: 'log-id', ...(updates as any) } as FeedLog)),
  deleteFeedLog: vi.fn<[string, string], Promise<null>>().mockResolvedValue(null),
  // Tags
  getAllTags: vi.fn<[], Promise<TagMap>>().mockResolvedValue({} as TagMap),
} as const;
