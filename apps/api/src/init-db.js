import 'dotenv/config';
import { db, initializeDatabase } from './db.js';

await initializeDatabase();
console.log('Database IKHLAS siap digunakan.');
db.close();
