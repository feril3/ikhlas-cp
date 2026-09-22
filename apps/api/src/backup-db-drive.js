import 'dotenv/config';
import { createDatabaseBackupToDrive } from './driveBackup.js';

try {
  const result = await createDatabaseBackupToDrive({ reason: 'manual' });
  console.log('Backup SQLite ke Google Drive berhasil.');
  console.log(`File: ${result.filename}`);
  console.log(`Drive file ID: ${result.driveFileId}`);
  console.log(`Ukuran: ${result.size} bytes`);
  console.log(
    `Retention: keep ${result.retention.kept}, deleted ${result.retention.deleted}`
  );
} catch (error) {
  console.error('Backup SQLite ke Google Drive gagal:', error);
  process.exitCode = 1;
}
