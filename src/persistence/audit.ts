import { db } from "./db";
export function logAudit(userId: number, action: string, entityType: string | null, entityId: number | null, requestId: string, payload: unknown, success: boolean) {
  db.prepare("INSERT INTO audit (user_id, action, entity_type, entity_id, request_id, payload_json, success) VALUES (?, ?, ?, ?, ?, ?, ?)").run(userId, action, entityType, entityId, requestId, JSON.stringify(payload ?? {}), success ? 1 : 0);
}
export function lastAudit(userId: number, action: string): { created_at: string } | undefined {
  return db.prepare("SELECT created_at FROM audit WHERE user_id = ? AND action = ? ORDER BY created_at DESC LIMIT 1").get(userId, action) as { created_at: string } | undefined;
}
