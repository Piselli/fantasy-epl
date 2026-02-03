export interface Player {
  id: number;
  name: string;
  team: string;
  teamId: number;
  position: "GK" | "DEF" | "MID" | "FWD";
  positionId: number;
  price: number;
  imageUrl?: string;
}

export interface SelectedPlayer extends Player {
  isStarter: boolean;
  isCaptain: boolean;
}

export interface Team {
  starters: (Player | null)[];  // 11 players in formation order
  bench: (Player | null)[];     // 3 substitutes
  captain: Player | null;
}

export interface Gameweek {
  id: number;
  status: "open" | "closed" | "resolved";
  prizePool: number;
  totalEntries: number;
}

export interface UserTitle {
  titleType: number;
  multiplier: number;
  season: number;
}

export interface UserGuild {
  multiplier: number;
  season: number;
}

export interface TeamResult {
  owner: string;
  basePoints: number;
  ratingBonus: number;
  titleTriggered: boolean;
  titleMultiplier: number;
  guildTriggered: boolean;
  guildMultiplier: number;
  finalPoints: number;
  rank: number;
  prizeAmount: number;
  claimed: boolean;
}

export interface PlayerStats {
  playerId: number;
  position: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  saves: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  ownGoals: number;
  yellowCards: number;
  redCards: number;
  rating: number;
  tackles: number;
  interceptions: number;
  successfulDribbles: number;
  freeKickGoals: number;
}
