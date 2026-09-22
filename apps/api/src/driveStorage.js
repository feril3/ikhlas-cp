import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { google } from 'googleapis';

const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const DEFAULT_FOLDER_NAME = 'IKHLAS - Bukti Transaksi';
const DEFAULT_BACKUP_FOLDER_NAME = 'IKHLAS - Backup Database';

let driveClient;
let storageFolderPromise;
let backupFolderPromise;

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

async function validateConfiguredFolder(folderId, envName) {
  const drive = getDrive();
  const result = await drive.files.get({
    fileId: folderId,
    fields: 'id,name,mimeType,trashed',
    supportsAllDrives: true
  });

  if (result.data.trashed || result.data.mimeType !== FOLDER_MIME) {
    throw new Error(`${envName} harus menunjuk ke folder Google Drive yang aktif.`);
  }

  return result.data.id;
}

async function findOrCreateTaggedFolder({
  configuredFolderId,
  configuredFolderEnv,
  folderName,
  appPropertyKey
}) {
  const drive = getDrive();

  if (configuredFolderId) {
    return validateConfiguredFolder(configuredFolderId, configuredFolderEnv);
  }

  const list = await drive.files.list({
    q: `mimeType='${FOLDER_MIME}' and trashed=false and appProperties has { key='${appPropertyKey}' and value='true' }`,
    spaces: 'drive',
    fields: 'files(id,name)',
    pageSize: 10
  });

  const existing = list.data.files?.[0];
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: FOLDER_MIME,
      appProperties: {
        [appPropertyKey]: 'true',
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

async function findOrCreateStorageFolder() {
  return findOrCreateTaggedFolder({
    configuredFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID?.trim(),
    configuredFolderEnv: 'GOOGLE_DRIVE_FOLDER_ID',
    folderName: process.env.GOOGLE_DRIVE_FOLDER_NAME?.trim() || DEFAULT_FOLDER_NAME,
    appPropertyKey: 'ikhlasStorageRoot'
  });
}

async function findOrCreateBackupFolder() {
  return findOrCreateTaggedFolder({
    configuredFolderId: process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID?.trim(),
    configuredFolderEnv: 'GOOGLE_DRIVE_BACKUP_FOLDER_ID',
    folderName: process.env.GOOGLE_DRIVE_BACKUP_FOLDER_NAME?.trim() || DEFAULT_BACKUP_FOLDER_NAME,
    appPropertyKey: 'ikhlasBackupRoot'
  });
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

export async function getBackupFolderId() {
  if (!backupFolderPromise) {
    backupFolderPromise = findOrCreateBackupFolder().catch((error) => {
      backupFolderPromise = undefined;
      throw error;
    });
  }

  return backupFolderPromise;
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

export async function uploadDatabaseBackup(filePath, {
  filename,
  createdAt = new Date().toISOString()
} = {}) {
  const drive = getDrive();
  const parentId = await getBackupFolderId();
  const stat = await fs.promises.stat(filePath);

  if (!stat.isFile() || stat.size === 0) {
    throw new Error('Snapshot SQLite tidak valid atau kosong.');
  }

  const response = await drive.files.create({
    requestBody: {
      name: filename || path.basename(filePath),
      parents: [parentId],
      appProperties: {
        ikhlasDatabaseBackup: 'true',
        ikhlasBackupCreatedAt: createdAt,
        source: 'IKHLAS'
      }
    },
    media: {
      mimeType: 'application/x-sqlite3',
      body: fs.createReadStream(filePath)
    },
    fields: 'id,name,mimeType,size,createdTime',
    supportsAllDrives: true
  });

  if (!response.data.id) {
    throw new Error('Google Drive tidak mengembalikan file ID backup.');
  }

  return {
    id: response.data.id,
    name: response.data.name,
    size: Number(response.data.size || stat.size),
    createdTime: response.data.createdTime || createdAt
  };
}

export async function listDatabaseBackups() {
  const drive = getDrive();
  const parentId = await getBackupFolderId();
  const files = [];
  let pageToken;

  do {
    const response = await drive.files.list({
      q: `'${parentId}' in parents and trashed=false and appProperties has { key='ikhlasDatabaseBackup' and value='true' }`,
      spaces: 'drive',
      fields: 'nextPageToken,files(id,name,size,createdTime,appProperties)',
      orderBy: 'createdTime desc',
      pageSize: 100,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    files.push(...(response.data.files ?? []));
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return files;
}

export async function pruneDatabaseBackups(retentionCount = 30) {
  const keep = Math.max(1, Math.min(Number(retentionCount) || 30, 365));
  const drive = getDrive();
  const backups = await listDatabaseBackups();
  const stale = backups.slice(keep);

  const deleted = [];
  for (const file of stale) {
    try {
      await drive.files.delete({
        fileId: file.id,
        supportsAllDrives: true
      });
      deleted.push(file.id);
    } catch (error) {
      if (error?.code !== 404) throw error;
    }
  }

  return {
    kept: Math.min(backups.length, keep),
    deleted: deleted.length,
    totalBeforePrune: backups.length
  };
}

export function getGoogleDriveScope() {
  return DRIVE_FILE_SCOPE;
}
