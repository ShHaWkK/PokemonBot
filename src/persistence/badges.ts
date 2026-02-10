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
export function getBadgeAtkBonus(userId: number): number {
  const rows = db.prepare("SELECT b.bonus_json as j FROM badges b JOIN user_badges ub ON ub.badge_id = b.id WHERE ub.user_id = ?").all(userId) as { j: string }[];
  let sum = 0;
  for (const r of rows) {
    try {
      const o = JSON.parse(r.j) as { atk?: number };
      sum += o.atk || 0;
    } catch {
    }
  }
  return sum;
}
