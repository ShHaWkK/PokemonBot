import { typeMultiplier } from "../src/game/types";
import { describe, it, expect } from "vitest";
describe("typeMultiplier", () => {
  it("fire vs grass is super effective", () => {
    expect(typeMultiplier("Feu", ["Plante"])).toBe(2);
  });
  it("water vs fire is super effective", () => {
    expect(typeMultiplier("Eau", ["Feu"])).toBe(2);
  });
  it("electric vs water and flying stacks", () => {
    expect(typeMultiplier("Electrik", ["Eau", "Vol"])).toBe(4);
  });
  it("grass vs fire is not very effective", () => {
    expect(typeMultiplier("Plante", ["Feu"])).toBe(0.5);
  });
});
