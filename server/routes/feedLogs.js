import express from 'express';
import { query } from '../db.js';

const router = express.Router();

const toCamel = (r) => ({
  id: r.id,
  date: r.date,
  pounds: Number(r.pounds || 0),
  cost: Number(r.cost || 0),
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

async function recalcChickenAggregates(chickenId) {
  // Sum pounds and cost for this chicken and update chickens table
  const { rows } = await query(
    `select coalesce(sum(pounds),0) as pounds, coalesce(sum(cost),0) as cost
     from public.feed_logs where chicken_id=$1`,
    [chickenId]
  );
  const totals = rows[0] || { pounds: 0, cost: 0 };
  await query(
    'update public.chickens set feed_usage=$1, feed_cost=$2, updated_at=now() where id=$3',
    [Number(totals.pounds || 0), Number(totals.cost || 0), chickenId]
  );
}

// List feed logs for a chicken
router.get('/:id/feed-logs', async (req, res) => {
  const { id } = req.params;
  const { rows } = await query(
    'select * from public.feed_logs where chicken_id=$1 order by date asc',
    [id]
  );
  res.json(rows.map(toCamel));
});

// Create feed log for a chicken
router.post('/:id/feed-logs', async (req, res) => {
  const { id } = req.params;
  const b = req.body;
  const { rows } = await query(
    `insert into public.feed_logs (chicken_id, date, pounds, cost, notes)
     values ($1,$2,$3,$4,$5)
     returning *`,
    [
      id,
      b.date || new Date().toISOString(),
      Number(b.pounds || 0),
      Number(b.cost || 0),
      b.notes || null,
    ]
  );
  await recalcChickenAggregates(id);
  res.status(201).json(toCamel(rows[0]));
});

// Update a feed log
router.patch('/:id/feed-logs/:logId', async (req, res) => {
  const { id, logId } = req.params;
  const b = req.body;
  const fields = [];
  const values = [];
  const push = (col, val) => { values.push(val); fields.push(`${col}=$${values.length}`); };

  if (b.date !== undefined) push('date', b.date);
  if (b.pounds !== undefined) push('pounds', Number(b.pounds));
  if (b.cost !== undefined) push('cost', Number(b.cost));
  if (b.notes !== undefined) push('notes', b.notes || null);

  if (fields.length === 0) {
    const { rows } = await query('select * from public.feed_logs where id=$1 and chicken_id=$2', [logId, id]);
    return res.json(rows.length ? toCamel(rows[0]) : null);
  }

  const sql = `update public.feed_logs set ${fields.join(', ')}, updated_at=now() where id=$${values.length + 1} and chicken_id=$${values.length + 2} returning *`;
  values.push(logId, id);
  const { rows } = await query(sql, values);
  await recalcChickenAggregates(id);
  res.json(rows.length ? toCamel(rows[0]) : null);
});

// Delete a feed log
router.delete('/:id/feed-logs/:logId', async (req, res) => {
  const { id, logId } = req.params;
  await query('delete from public.feed_logs where id=$1 and chicken_id=$2', [logId, id]);
  await recalcChickenAggregates(id);
  res.status(204).end();
});

export default router;
