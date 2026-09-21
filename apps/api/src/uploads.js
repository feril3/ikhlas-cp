import path from 'node:path';
import multer from 'multer';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

export const transactionUpload = multer({
  storage: multer.memoryStorage(),
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
