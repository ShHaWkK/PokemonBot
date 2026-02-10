import { db } from "./db";
export function recordRequest(userId: number, requestId: string): boolean {
  try {
    db.prepare("INSERT INTO idempotency (user_id, request_id) VALUES (?, ?)").run(userId, requestId);
    return true;
  } catch {
    return false;
  }
}
