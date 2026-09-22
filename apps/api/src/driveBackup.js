import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { db } from './db.js';
import {
  isGoogleDriveConfigured,
  listDatabaseBackups,
  pruneDatabaseBackups,
  uploadDatabaseBackup
} from './driveStorage.js';

let backupInProgress = false;

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export function getDatabaseBackupConfig() {
  const enabled = String(process.env.GOOGLE_DRIVE_BACKUP_ENABLED ?? 'false').toLowerCase() === 'true';
  const hour = clampInteger(process.env.GOOGLE_DRIVE_BACKUP_HOUR, 2, 0, 23);
  const minute = clampInteger(process.env.GOOGLE_DRIVE_BACKUP_MINUTE, 0, 0, 59);
  const retention = clampInteger(process.env.GOOGLE_DRIVE_BACKUP_RETENTION, 30, 1, 365);
  const timezone = process.env.GOOGLE_DRIVE_BACKUP_TIMEZONE?.trim() || 'Asia/Jakarta';

  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error(`GOOGLE_DRIVE_BACKUP_TIMEZONE tidak valid: ${timezone}`);
  }

  return {
    enabled,
    hour,
    minute,
    retention,
    timezone
  };
}

function zonedParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute)
  };
}

function isDueNow(now, config) {
  const current = zonedParts(now, config.timezone);
  const currentMinutes = current.hour * 60 + current.minute;
  const targetMinutes = config.hour * 60 + config.minute;

  return {
    ...current,
    due: currentMinutes >= targetMinutes
  };
}

function backupDateKey(backup, timezone) {
  const raw = backup.appProperties?.ikhlasBackupCreatedAt || backup.createdTime;
  if (!raw) return null;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return zonedParts(date, timezone).dateKey;
}

export async function createDatabaseBackupToDrive({
  reason = 'manual',
  retention
} = {}) {
  if (backupInProgress) {
    const error = new Error('Backup database sedang berjalan.');
    error.code = 'BACKUP_IN_PROGRESS';
    throw error;
  }

  if (!isGoogleDriveConfigured()) {
    const error = new Error('Google Drive belum dikonfigurasi.');
    error.code = 'GOOGLE_DRIVE_NOT_CONFIGURED';
    throw error;
  }

  backupInProgress = true;
  const config = getDatabaseBackupConfig();
  const keep = retention ?? config.retention;
  const createdAt = new Date();
  const timestamp = createdAt.toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const filename = `ikhlas-db-${timestamp}.sqlite3`;
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ikhlas-db-backup-'));
  const destination = path.join(tempDir, filename);

  try {
    await db.backup(destination);

    const stat = await fs.promises.stat(destination);
    if (!stat.isFile() || stat.size === 0) {
      throw new Error('Snapshot SQLite gagal dibuat.');
    }

    const uploaded = await uploadDatabaseBackup(destination, {
      filename,
      createdAt: createdAt.toISOString()
    });

    const retentionResult = await pruneDatabaseBackups(keep);

    return {
      reason,
      createdAt: createdAt.toISOString(),
      filename: uploaded.name,
      driveFileId: uploaded.id,
      size: uploaded.size,
      retention: retentionResult
    };
  } finally {
    backupInProgress = false;
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

export function startDatabaseBackupScheduler({
  logger = console
} = {}) {
  const config = getDatabaseBackupConfig();

  if (!config.enabled) {
    logger.log('Google Drive database backup scheduler: disabled');
    return {
      enabled: false,
      stop() {}
    };
  }

  if (!isGoogleDriveConfigured()) {
    logger.warn('Google Drive database backup scheduler aktif, tetapi credential Drive belum lengkap.');
    return {
      enabled: true,
      stop() {}
    };
  }

  let stopped = false;
  let lastCompletedDateKey = null;

  async function tick() {
    if (stopped || backupInProgress) return;

    const now = new Date();
    const due = isDueNow(now, config);
    if (!due.due || lastCompletedDateKey === due.dateKey) return;

    try {
      const existing = await listDatabaseBackups();
      const alreadyBackedUp = existing.some(
        (backup) => backupDateKey(backup, config.timezone) === due.dateKey
      );

      if (alreadyBackedUp) {
        lastCompletedDateKey = due.dateKey;
        return;
      }

      logger.log(
        `Menjalankan auto backup SQLite ke Google Drive untuk ${due.dateKey} (${config.timezone}).`
      );

      const result = await createDatabaseBackupToDrive({
        reason: 'scheduled',
        retention: config.retention
      });

      lastCompletedDateKey = due.dateKey;
      logger.log(
        `Auto backup SQLite berhasil: ${result.filename} (${result.size} bytes, retention ${config.retention}).`
      );
    } catch (error) {
      logger.error('Auto backup SQLite ke Google Drive gagal:', error);
    }
  }

  const interval = setInterval(tick, 60_000);
  interval.unref?.();

  // Cek segera saat server hidup. Jika jadwal hari ini sudah lewat tetapi
  // backup belum ada (misalnya server sempat mati), backup tetap dikejar.
  void tick();

  logger.log(
    `Google Drive database backup scheduler: daily ${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')} ${config.timezone}, keep ${config.retention}.`
  );

  return {
    enabled: true,
    config,
    stop() {
      stopped = true;
      clearInterval(interval);
    }
  };
}
