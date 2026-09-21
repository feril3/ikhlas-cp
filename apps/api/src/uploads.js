import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadDirectory = path.resolve(__dirname, '../data/uploads');

fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${randomBytes(12).toString('hex')}${extension}`);
  }
});

export const transactionUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 2
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) {
      return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }

    callback(null, true);
  }
}).fields([
  { name: 'evidence', maxCount: 1 },
  { name: 'mutation', maxCount: 1 }
]);

export function safeAttachmentPath(filename) {
  const normalized = path.basename(filename);
  const resolved = path.resolve(uploadDirectory, normalized);
  if (!resolved.startsWith(uploadDirectory + path.sep)) return null;
  return resolved;
}
