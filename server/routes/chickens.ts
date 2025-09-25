import express, { Request, Response } from 'express';

import { query } from '../db.js';

const router = express.Router();

router.get('/', async (_req: Request, res: Response) => {
  const { rows } = await query<{
    id: string;
    batchName: string;
    initialCount: number;
    currentCount: number;
    status: string;
    tags: string[] | null;
    feedCost: number;
    feedUsage: number;
    chickOrderDate: string | null;
    chickDeliveryDate: string | null;
    cullDate: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string | null;
  }>(`
    select
      id,
      batch_name          as "batchName",
      initial_count       as "initialCount",
      current_count       as "currentCount",
      status,
      tags,
      coalesce(feed_cost, 0)  as "feedCost",
      coalesce(feed_usage, 0) as "feedUsage",
      chick_order_date    as "chickOrderDate",
      chick_delivery_date as "chickDeliveryDate",
      cull_date           as "cullDate",
      notes,
      created_at          as "createdAt",
      updated_at          as "updatedAt"
    from public.chickens
    order by created_at desc
  `);
  res.json(rows);
});

router.post('/', async (req: Request, res: Response) => {
  const b = req.body || {};
  const { rows } = await query(`
    insert into public.chickens (
      batch_name, initial_count, current_count, status, tags,
      feed_cost, feed_usage, chick_order_date, chick_delivery_date, cull_date, notes
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    returning id,
      batch_name          as "batchName",
      initial_count       as "initialCount",
      current_count       as "currentCount",
      status,
      tags,
      coalesce(feed_cost, 0)  as "feedCost",
      coalesce(feed_usage, 0) as "feedUsage",
      chick_order_date    as "chickOrderDate",
      chick_delivery_date as "chickDeliveryDate",
      cull_date           as "cullDate",
      notes,
      created_at          as "createdAt",
      updated_at          as "updatedAt"
  `,
  [
    b.batchName,
    Number(b.initialCount),
    Number(b.currentCount ?? b.initialCount),
    b.status || 'Active',
    Array.isArray(b.tags) ? b.tags : [],
    Number(b.feedCost || 0),
    Number(b.feedUsage || 0),
    b.chickOrderDate || null,
    b.chickDeliveryDate || null,
    b.cullDate || null,
    b.notes || null,
  ]);
  res.status(201).json(rows[0]);
});

router.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const b = req.body || {};
  const fields: string[] = [];
  const values: any[] = [];
  const push = (col: string, val: any) => { values.push(val); fields.push(`${col}=$${values.length}`); };

  if (b.batchName !== undefined) push('batch_name', b.batchName);
  if (b.initialCount !== undefined) push('initial_count', Number(b.initialCount));
  if (b.currentCount !== undefined) push('current_count', Number(b.currentCount));
  if (b.status !== undefined) push('status', b.status);
  if (b.tags !== undefined) push('tags', Array.isArray(b.tags) ? b.tags : []);
  if (b.feedCost !== undefined) push('feed_cost', Number(b.feedCost));
  if (b.feedUsage !== undefined) push('feed_usage', Number(b.feedUsage));
  if (b.chickOrderDate !== undefined) push('chick_order_date', b.chickOrderDate || null);
  if (b.chickDeliveryDate !== undefined) push('chick_delivery_date', b.chickDeliveryDate || null);
  if (b.cullDate !== undefined) push('cull_date', b.cullDate || null);
  if (b.notes !== undefined) push('notes', b.notes || null);

  if (fields.length === 0) {
    const { rows } = await query(`
      select id,
        batch_name          as "batchName",
        initial_count       as "initialCount",
        current_count       as "currentCount",
        status,
        tags,
        coalesce(feed_cost, 0)  as "feedCost",
        coalesce(feed_usage, 0) as "feedUsage",
        chick_order_date    as "chickOrderDate",
        chick_delivery_date as "chickDeliveryDate",
        cull_date           as "cullDate",
        notes,
        created_at          as "createdAt",
        updated_at          as "updatedAt"
      from public.chickens where id=$1
    `, [id]);
    return res.json(rows.length ? rows[0] : null);
  }

  const sql = `update public.chickens set ${fields.join(', ')}, updated_at=now() where id=$${values.length + 1}
    returning id,
      batch_name          as "batchName",
      initial_count       as "initialCount",
      current_count       as "currentCount",
      status,
      tags,
      coalesce(feed_cost, 0)  as "feedCost",
      coalesce(feed_usage, 0) as "feedUsage",
      chick_order_date    as "chickOrderDate",
      chick_delivery_date as "chickDeliveryDate",
      cull_date           as "cullDate",
      notes,
      created_at          as "createdAt",
      updated_at          as "updatedAt"`;
  values.push(id);
  const { rows } = await query(sql, values);
  res.json(rows.length ? rows[0] : null);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await query('delete from public.chickens where id=$1', [id]);
  res.status(204).end();
});

export default router;
