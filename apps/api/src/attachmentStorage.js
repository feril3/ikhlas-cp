import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { db, usingTurso } from './db.js';
import {
  deleteTransactionAttachment as deleteDriveAttachment,
  getTransactionAttachment as getDriveAttachment,
  isGoogleDriveConfigured,
  uploadTransactionAttachment as uploadDriveAttachment
} from './driveStorage.js';

// Bukti transaksi disimpan di Google Drive bila kredensialnya tersedia. Selama Drive belum siap
// (atau gagal dihubungi), berkas disimpan di tabel attachment_blobs pada basis data (Turso).
// ID berkas basis data diberi awalan "db:" sehingga unduh dan hapus tahu harus ke mana.
const DB_PREFIX = 'db:';

export const isDatabaseAttachment = (fileId) => typeof fileId === 'string' && fileId.startsWith(DB_PREFIX);

export function getAttachmentStorageInfo() {
  const drive = isGoogleDriveConfigured();
  return {
    provider: drive ? 'google-drive' : usingTurso ? 'turso' : 'database',
    fallback: usingTurso ? 'turso' : 'database',
    configured: true,
    googleDriveConfigured: drive
  };
}

async function saveToDatabase(file, context) {
  const id = DB_PREFIX + randomUUID();
  await db.prepare(`
    INSERT INTO attachment_blobs (id, transaction_id, kind, original_name, mime_type, size, data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    context.transactionId ?? null,
    context.kind === 'mutation' ? 'mutation' : 'evidence',
    file.originalname,
    file.mimetype,
    file.buffer.length,
    new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength)
  );
  return { id, name: file.originalname, mimeType: file.mimetype, originalName: file.originalname };
}

export async function uploadTransactionAttachment(file, context) {
  if (!file?.buffer?.length) throw new Error('File upload kosong.');

  if (isGoogleDriveConfigured()) {
    try {
      return await uploadDriveAttachment(file, context);
    } catch (error) {
      console.warn('Upload Google Drive gagal; bukti disimpan di basis data.', error?.message || error);
    }
  }
  return saveToDatabase(file, context);
}

export async function getTransactionAttachment(fileId) {
  if (!isDatabaseAttachment(fileId)) return getDriveAttachment(fileId);

  const row = await db.prepare(`
    SELECT id, original_name AS name, mime_type AS mimeType, size, data
    FROM attachment_blobs WHERE id = ?
  `).get(fileId);
  if (!row) {
    const error = new Error('Dokumen tidak ditemukan.');
    error.code = 'ATTACHMENT_NOT_FOUND';
    throw error;
  }
  const buffer = Buffer.from(row.data);
  return {
    metadata: { id: row.id, name: row.name, mimeType: row.mimeType, size: buffer.length },
    stream: Readable.from([buffer])
  };
}

export async function deleteTransactionAttachment(fileId) {
  if (!fileId) return;
  if (isDatabaseAttachment(fileId)) {
    await db.prepare('DELETE FROM attachment_blobs WHERE id = ?').run(fileId);
    return;
  }
  if (!isGoogleDriveConfigured()) return; // berkas Drive lama tidak dapat dihapus tanpa kredensial
  await deleteDriveAttachment(fileId);
}
