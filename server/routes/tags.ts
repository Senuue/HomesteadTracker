import express, { Request, Response } from 'express';
import { query } from '../db.js';

const router = express.Router();

router.get('/', async (_req: Request, res: Response) => {
  const { rows } = await query<{ tags: string[] | null }>('select tags from public.chickens');
  const map = new Map<string, number>();
  rows.forEach((r: { tags: string[] | null }) => {
    (Array.isArray(r.tags) ? r.tags : []).forEach((t: string) => {
      const key = String(t).trim();
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
  });
  res.json(Object.fromEntries(Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))));
});

export default router;
