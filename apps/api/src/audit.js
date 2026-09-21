import { db } from './db.js';

export function logAudit(req, {
  action,
  entityType,
  entityId = null,
  details = null,
  userId = req?.user?.id ?? null
}) {
  try {
    db.prepare(`
      INSERT INTO audit_logs
        (user_id, action, entity_type, entity_id, details_json, ip_address, user_agent)
      VALUES
        (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      action,
      entityType,
      entityId == null ? null : String(entityId),
      details == null ? null : JSON.stringify(details),
      req?.ip ?? null,
      req?.get?.('user-agent')?.slice(0, 300) ?? null
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
