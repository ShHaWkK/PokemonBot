process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
const { seedIfNeeded } = await import("../src/persistence/seed");
const { db } = await import("../src/persistence/db");
const { createGymBattle, getBattle } = await import("../src/game/battle");
seedIfNeeded();
describe("gyms and badges seeding", () => {
  it("seeds 8 gyms with badge mapping", () => {
    const c = db.prepare("SELECT COUNT(1) as c FROM gyms").get() as { c: number };
    expect(c.c).toBeGreaterThanOrEqual(8);
    const g = db.prepare("SELECT id, badge_id FROM gyms ORDER BY id").all() as { id:number; badge_id:number }[];
    expect(g[0].badge_id).toBeGreaterThan(0);
    expect(g[7].badge_id).toBe(8);
  });
  it("createGymBattle sets rewards badgeId", () => {
    db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("ugym", 0, "{}");
    const uid = db.prepare("SELECT id FROM users WHERE discord_user_id = ?").get("ugym") as { id: number };
    const bid = createGymBattle(uid.id, 2);
    const b = getBattle(bid)!;
    expect((b.rewards as any)?.badgeId).toBe(2);
  });
});
