import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import chickensRouter from './routes/chickens.js';
import feedLogsRouter from './routes/feedLogs.js';
import tagsRouter from './routes/tags.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.API_PORT || 5174);
const ORIGIN = process.env.VITE_APP_URL || 'http://localhost:5173';

app.use(cors({ origin: ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/chickens', chickensRouter);
app.use('/chickens', feedLogsRouter); // mount feed logs under /chickens
app.use('/tags', tagsRouter);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
