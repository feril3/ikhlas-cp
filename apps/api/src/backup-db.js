import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupDirectory = path.resolve(__dirname, '../data/backups');
fs.mkdirSync(backupDirectory, { recursive: true });

const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const destination = path.join(backupDirectory, `ikhlas-${timestamp}.db`);

await db.backup(destination);
console.log(`Backup database tersimpan: ${destination}`);
