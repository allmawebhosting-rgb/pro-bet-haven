export const SPORTS = [
  "football",
  "basketball",
  "tennis",
  "ice_hockey",
  "baseball",
  "cricket",
  "rugby",
  "combat",
  "esports",
  "other",
] as const;

export type Sport = (typeof SPORTS)[number];

export const SPORT_LABEL: Record<Sport, string> = {
  football: "Football",
  basketball: "Basketball",
  tennis: "Tennis",
  ice_hockey: "Ice Hockey",
  baseball: "Baseball",
  cricket: "Cricket",
  rugby: "Rugby",
  combat: "Boxing / MMA",
  esports: "eSports",
  other: "Other",
};

/** Sports played by individuals rather than home/away clubs. */
const INDIVIDUAL: Sport[] = ["tennis", "combat"];

export function participantLabels(sport: Sport): { home: string; away: string } {
  return INDIVIDUAL.includes(sport)
    ? { home: "Player 1", away: "Player 2" }
    : { home: "Home", away: "Away" };
}

export function versusWord(sport: Sport): string {
  return INDIVIDUAL.includes(sport) ? "vs" : "vs";
}

export function isSport(value: unknown): value is Sport {
  return typeof value === "string" && (SPORTS as readonly string[]).includes(value);
}

export function sportLabel(value: unknown): string {
  return isSport(value) ? SPORT_LABEL[value] : SPORT_LABEL.football;
}
