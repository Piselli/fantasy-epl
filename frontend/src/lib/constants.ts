import { Network } from "@aptos-labs/ts-sdk";

// Network configuration - Movement Testnet
export const NETWORK = Network.CUSTOM;
export const MOVEMENT_TESTNET_URL = "https://testnet.movementnetwork.xyz/v1";

// Contract address
export const MODULE_ADDRESS = "0x7e4bb3190ea304798c1825e8f0d8d49e85429cba5511cdd51ba3d23921228b41";

// Module name
export const MODULE_NAME = "fantasy_epl";

// Entry fee in MOVE (for display)
export const ENTRY_FEE_MOVE = 1;

// Title types
export const TITLE_TYPES = {
  0: { name: "Tackles Master", category: "Defensive", description: "Your player has most tackles + interceptions" },
  1: { name: "Penalty Box Wall", category: "Defensive", description: "Your GK has most saves/clean sheets" },
  2: { name: "Free-Kick Specialist", category: "Attacking", description: "Your player scores from a free kick" },
  3: { name: "Team Striker", category: "Attacking", description: "Your team scores 3+ goals combined" },
  4: { name: "Dribble King", category: "Attacking", description: "Your player has most successful dribbles" },
} as const;

// Multiplier display
export const MULTIPLIER_DISPLAY = {
  500: "5%",
  1000: "10%",
  1500: "15%",
} as const;

// Positions
export const POSITIONS = {
  GK: 0,
  DEF: 1,
  MID: 2,
  FWD: 3,
} as const;

export const POSITION_NAMES = {
  0: "GK",
  1: "DEF",
  2: "MID",
  3: "FWD",
} as const;

// Formation requirements (4-3-3)
export const FORMATION = {
  GK: 1,
  DEF: 4,
  MID: 3,
  FWD: 3,
  BENCH: 3,
  TOTAL: 14,
} as const;

// Max players per club
export const MAX_PER_CLUB = 3;
