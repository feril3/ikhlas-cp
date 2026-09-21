import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db.js';
import { apiRouter } from './routes.js';

initializeDatabase();

const app = express();
const port = Number(process.env.PORT ?? 3001);
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

app.disable('x-powered-by');
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));

app.use('/api', apiRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
});

app.listen(port, () => {
  console.log(`IKHLAS API running at http://localhost:${port}`);
});
