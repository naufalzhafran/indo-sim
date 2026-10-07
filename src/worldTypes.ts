/** Geography-facing data shared by the tabletop map and the economic model. */
export type Province = {
  id: string;
  name: string;
  population: number;
  gdp: number;
  growth: number;
  poverty: number;
  unemployment: number;
  infrastructure: number;
  health: number;
  education: number;
  energy: number;
  foodSecurity: number;
  development: number;
  foodProduction: number;
  foodNeed: number;
  reliability: number;
  electrification: number;
};
export type Project = {
  id: string;
  province: string;
  name: string;
  cost: number;
  spent: number;
  progress: number;
  duration: number;
  completed: boolean;
  paused: boolean;
  completionRewardGranted?: boolean;
};
export type Crisis = {
  id: string;
  title: string;
  description: string;
  province: string;
  months: number;
  severity: number;
  response: "relief";
  resolved: boolean;
  kind: "flood" | "harvest" | "earthquake" | "haze" | "outbreak";
  stage: "warning" | "active" | "recovery";
  damage: number;
  initialDamage: number;
  age: number;
};
