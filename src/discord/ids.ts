import { customAlphabet } from "nanoid";
const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);
export type ComponentId = {
  scene: string;
  action: string;
  data?: string;
};
export function makeId(userId: string, c: ComponentId): string {
  const nonce = nano();
  return `u:${userId}|s:${c.scene}|a:${c.action}|d:${c.data || ""}|n:${nonce}`;
}
export function parseId(id: string): ComponentId & { userId: string; nonce: string } {
  const parts = id.split("|").reduce((acc, p) => {
    const [k, v] = p.split(":");
    acc[k] = v;
    return acc;
  }, {} as Record<string, string>);
  return { userId: parts["u"], scene: parts["s"], action: parts["a"], data: parts["d"], nonce: parts["n"] };
}
