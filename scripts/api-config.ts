// API-Sports Configuration
// Get your API key from: https://www.api-football.com/

export const API_CONFIG = {
  baseUrl: "https://v3.football.api-sports.io",
  apiKey: process.env.API_SPORTS_KEY || "",
  leagueId: 39, // English Premier League
  season: 2024,
};

// EPL Team IDs from API-Sports
export const EPL_TEAMS: Record<number, { name: string; shortName: string }> = {
  33: { name: "Manchester United", shortName: "MUN" },
  34: { name: "Newcastle", shortName: "NEW" },
  35: { name: "Bournemouth", shortName: "BOU" },
  36: { name: "Fulham", shortName: "FUL" },
  39: { name: "Wolverhampton", shortName: "WOL" },
  40: { name: "Liverpool", shortName: "LIV" },
  42: { name: "Arsenal", shortName: "ARS" },
  45: { name: "Everton", shortName: "EVE" },
  46: { name: "Leicester", shortName: "LEI" },
  47: { name: "Tottenham", shortName: "TOT" },
  48: { name: "West Ham", shortName: "WHU" },
  49: { name: "Chelsea", shortName: "CHE" },
  50: { name: "Manchester City", shortName: "MCI" },
  51: { name: "Brighton", shortName: "BRI" },
  52: { name: "Crystal Palace", shortName: "CRY" },
  55: { name: "Brentford", shortName: "BRE" },
  63: { name: "Ipswich", shortName: "IPS" },
  65: { name: "Nottingham Forest", shortName: "NFO" },
  66: { name: "Aston Villa", shortName: "AVL" },
  41: { name: "Southampton", shortName: "SOU" },
};

// Map API-Sports positions to our format
export function mapPosition(apiPosition: string): { position: string; positionId: number } {
  switch (apiPosition) {
    case "Goalkeeper":
      return { position: "GK", positionId: 0 };
    case "Defender":
      return { position: "DEF", positionId: 1 };
    case "Midfielder":
      return { position: "MID", positionId: 2 };
    case "Attacker":
      return { position: "FWD", positionId: 3 };
    default:
      return { position: "MID", positionId: 2 };
  }
}

// Estimate player price based on position and team (simplified)
export function estimatePrice(position: string, teamId: number): number {
  const topTeams = [40, 50, 42, 49, 47, 66]; // Liverpool, City, Arsenal, Chelsea, Spurs, Villa
  const isTopTeam = topTeams.includes(teamId);

  const basePrices: Record<string, number> = {
    GK: 4.5,
    DEF: 4.5,
    MID: 5.5,
    FWD: 6.0,
  };

  const base = basePrices[position] || 5.0;
  return isTopTeam ? base + 1.0 : base;
}

export async function fetchFromApi<T>(endpoint: string): Promise<T> {
  if (!API_CONFIG.apiKey) {
    throw new Error("API_SPORTS_KEY environment variable is required");
  }

  const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
    headers: {
      "x-apisports-key": API_CONFIG.apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
