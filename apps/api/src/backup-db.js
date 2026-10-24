import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, exportDatabaseSnapshot } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupDirectory = path.resolve(__dirname, '../data/backups');
fs.mkdirSync(backupDirectory, { recursive: true });

const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const destination = path.join(backupDirectory, `ikhlas-${timestamp}.json`);

fs.writeFileSync(destination, JSON.stringify(await exportDatabaseSnapshot(), null, 2));
console.log(`Backup database tersimpan: ${destination}`);
db.close();
