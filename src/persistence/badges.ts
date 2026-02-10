import { db } from "./db";
export function awardBadge(userId: number, badgeId: number): boolean {
  try {
    db.prepare("INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)").run(userId, badgeId);
    return true;
  } catch {
    return false;
  }
}
export function countBadges(userId: number): number {
  const row = db.prepare("SELECT COUNT(1) as c FROM user_badges WHERE user_id = ?").get(userId) as { c: number };
  return row.c;
}
