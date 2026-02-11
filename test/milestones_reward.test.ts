process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
const { seedIfNeeded } = await import("../src/persistence/seed");
const { db } = await import("../src/persistence/db");
const { rewardMilestones } = await import("../src/persistence/repo");
seedIfNeeded();
describe("récompenses de progression par paliers 10/20/30", () => {
  it("attribue Balls à franchissement de paliers", () => {
    const uid = db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("umil", 0, "{}").lastInsertRowid as number;
    const res = rewardMilestones(uid, [{ before: 9, after: 10 }, { before: 19, after: 20 }, { before: 29, after: 30 }]);
    expect(res.pokeball).toBe(1);
    expect(res.greatball).toBe(1);
    expect(res.ultraball).toBe(1);
    const inv = db.prepare("SELECT item_id, quantity FROM inventory WHERE owner_user_id = ? ORDER BY item_id").all(uid) as { item_id:number; quantity:number }[];
    const p = inv.find(i => i.item_id === 1)?.quantity || 0;
    const g = inv.find(i => i.item_id === 2)?.quantity || 0;
    const u = inv.find(i => i.item_id === 3)?.quantity || 0;
    expect(p).toBe(1);
    expect(g).toBe(1);
    expect(u).toBe(1);
  });
});
