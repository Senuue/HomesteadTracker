export type Status = 'Active' | 'Culled';

export interface FeedLog {
  id: string;
  chickenId?: string;
  date?: string; // YYYY-MM-DD
  pounds: number;
  cost: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Chicken {
  id: string;
  batchName: string;
  initialCount: number;
  currentCount: number;
  status: Status;
  tags: string[];
  feedCost: number;
  feedUsage: number;
  chickOrderDate?: string | null;
  chickDeliveryDate?: string | null;
  cullDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type TagMap = Record<string, number>;
