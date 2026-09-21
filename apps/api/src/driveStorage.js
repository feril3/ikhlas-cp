import path from 'node:path';
import { Readable } from 'node:stream';
import { google } from 'googleapis';

const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const DEFAULT_FOLDER_NAME = 'IKHLAS - Bukti Transaksi';

let driveClient;
let storageFolderPromise;

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    const error = new Error(`Konfigurasi Google Drive belum lengkap: ${name} belum diisi.`);
    error.code = 'GOOGLE_DRIVE_NOT_CONFIGURED';
    throw error;
  }
  return value;
}

function getDrive() {
  if (driveClient) return driveClient;

  const clientId = getRequiredEnv('GOOGLE_DRIVE_CLIENT_ID');
  const clientSecret = getRequiredEnv('GOOGLE_DRIVE_CLIENT_SECRET');
  const refreshToken = getRequiredEnv('GOOGLE_DRIVE_REFRESH_TOKEN');

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  driveClient = google.drive({
    version: 'v3',
    auth
  });

  return driveClient;
}

export function isGoogleDriveConfigured() {
  return Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_ID?.trim()
    && process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim()
    && process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim()
  );
}

async function findOrCreateStorageFolder() {
  const drive = getDrive();
  const configuredFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();

  if (configuredFolderId) {
    const result = await drive.files.get({
      fileId: configuredFolderId,
      fields: 'id,name,mimeType,trashed',
      supportsAllDrives: true
    });

    if (result.data.trashed || result.data.mimeType !== FOLDER_MIME) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID harus menunjuk ke folder Google Drive yang aktif.');
    }

    return result.data.id;
  }

  const list = await drive.files.list({
    q: `mimeType='${FOLDER_MIME}' and trashed=false and appProperties has { key='ikhlasStorageRoot' and value='true' }`,
    spaces: 'drive',
    fields: 'files(id,name)',
    pageSize: 10
  });

  const existing = list.data.files?.[0];
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: {
      name: process.env.GOOGLE_DRIVE_FOLDER_NAME?.trim() || DEFAULT_FOLDER_NAME,
      mimeType: FOLDER_MIME,
      appProperties: {
        ikhlasStorageRoot: 'true',
        source: 'IKHLAS'
      }
    },
    fields: 'id,name'
  });

  if (!created.data.id) {
    throw new Error('Google Drive tidak mengembalikan ID folder storage.');
  }

  return created.data.id;
}

export async function getStorageFolderId() {
  if (!storageFolderPromise) {
    storageFolderPromise = findOrCreateStorageFolder().catch((error) => {
      storageFolderPromise = undefined;
      throw error;
    });
  }

  return storageFolderPromise;
}

function sanitizeFilename(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 120) || 'attachment';
}

function buildDriveFilename(file, context) {
  const extension = path.extname(file.originalname).toLowerCase();
  const originalBase = path.basename(file.originalname, extension);
  const base = sanitizeFilename(originalBase);
  const kind = context.kind === 'mutation' ? 'mutasi' : 'bukti';
  const type = context.type === 'EXPENSE' ? 'keluar' : 'masuk';

  return [
    context.transactionDate,
    `trx-${context.transactionId}`,
    type,
    kind,
    base
  ].join('_') + extension;
}

export async function uploadTransactionAttachment(file, context) {
  if (!file?.buffer?.length) {
    throw new Error('File upload kosong.');
  }

  const drive = getDrive();
  const parentId = await getStorageFolderId();
  const name = buildDriveFilename(file, context);

  const response = await drive.files.create({
    requestBody: {
      name,
      parents: [parentId],
      appProperties: {
        ikhlasTransactionId: String(context.transactionId),
        ikhlasAttachmentKind: context.kind,
        ikhlasTransactionType: context.type
      }
    },
    media: {
      mimeType: file.mimetype,
      body: Readable.from(file.buffer)
    },
    fields: 'id,name,mimeType,size,createdTime',
    supportsAllDrives: true
  });

  if (!response.data.id) {
    throw new Error('Google Drive tidak mengembalikan file ID.');
  }

  return {
    id: response.data.id,
    name: response.data.name,
    mimeType: response.data.mimeType || file.mimetype,
    originalName: file.originalname
  };
}

export async function getTransactionAttachment(fileId) {
  const drive = getDrive();

  const metadata = await drive.files.get({
    fileId,
    fields: 'id,name,mimeType,size,trashed',
    supportsAllDrives: true
  });

  if (metadata.data.trashed) {
    const error = new Error('File Google Drive berada di Trash.');
    error.code = 'GOOGLE_DRIVE_FILE_TRASHED';
    throw error;
  }

  const media = await drive.files.get(
    {
      fileId,
      alt: 'media',
      supportsAllDrives: true
    },
    {
      responseType: 'stream'
    }
  );

  return {
    metadata: metadata.data,
    stream: media.data
  };
}

export async function deleteTransactionAttachment(fileId) {
  if (!fileId) return;

  const drive = getDrive();
  try {
    await drive.files.delete({
      fileId,
      supportsAllDrives: true
    });
  } catch (error) {
    if (error?.code === 404) return;
    throw error;
  }
}

export function getGoogleDriveScope() {
  return DRIVE_FILE_SCOPE;
}
