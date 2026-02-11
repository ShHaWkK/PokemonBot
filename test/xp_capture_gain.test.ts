process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
const { seedIfNeeded } = await import("../src/persistence/seed");
const { xpCaptureGainByZone } = await import("../src/persistence/repo");
seedIfNeeded();
describe("xp capture dynamique par biome", () => {
  it("Ville donne un gain de 3", () => {
    const gain = xpCaptureGainByZone(1);
    expect(gain).toBe(3);
  });
  it("Grottes donne un gain de 8", () => {
    const gain = xpCaptureGainByZone(4);
    expect(gain).toBe(8);
  });
});
