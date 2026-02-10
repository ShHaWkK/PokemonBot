export type SceneName = "Exploration" | "Equipe" | "Sac" | "Quetes" | "Pokedex" | "Arenes" | "Shop" | "Battle";
export type UserScreenState = {
  userId: string;
  activeScene: SceneName;
  zoneId: number;
  battleId?: number;
};
