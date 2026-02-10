process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
import { seedIfNeeded } from "../src/persistence/seed";
import { db } from "../src/persistence/db";
import { awardBadge, countBadges } from "../src/persistence/badges";
import { getInventory, adjustInventory } from "../src/persistence/repo";
seedIfNeeded();
describe("badges and mega shop gating", () => {
  it("badge increments and allows mega purchase with keystone", () => {
    db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("u5", 0, "{}");
    const uid = db.prepare("SELECT id FROM users WHERE discord_user_id = ?").get("u5") as { id: number };
    awardBadge(uid.id, 1);
    expect(countBadges(uid.id)).toBe(1);
    adjustInventory(uid.id, 30, 1);
    adjustInventory(uid.id, 34, 1);
    const inv = getInventory(uid.id);
    const mega = inv.find(i => i.item_id === 34)?.quantity || 0;
    expect(mega).toBeGreaterThan(0);
  });
});
