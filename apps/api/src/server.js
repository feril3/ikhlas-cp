import 'dotenv/config';
import { app } from './app.js';
import { ensureDatabase } from './db.js';
import { startDatabaseBackupScheduler } from './driveBackup.js';

// Server lokal / VPS. Di Vercel, aplikasi dijalankan melalui api/index.js.
await ensureDatabase();

const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
  console.log(`IKHLAS API running at http://localhost:${port}`);

  try {
    startDatabaseBackupScheduler();
  } catch (error) {
    console.error('Google Drive database backup scheduler gagal diinisialisasi:', error);
  }
});
