/**
 * API-Sports Football Data Integration
 * Fetches real EPL match stats for oracle submission
 */

const API_BASE_URL = "https://v3.football.api-sports.io";
const EPL_LEAGUE_ID = 39;
const SEASON = 2024;

// Player data from our local JSON (we'll load this)
let playerMappings: Map<number, { id: number; position: string }> | null = null;

interface ApiFixture {
  fixture: { id: number; status: { short: string } };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number; away: number };
}

interface ApiPlayerStats {
  player: { id: number; name: string };
  statistics: Array<{
    games: { minutes: number | null; position: string; rating: string | null };
    goals: { total: number | null; assists: number | null; saves: number | null };
    penalty: { saved: number | null; missed: number | null };
    cards: { yellow: number | null; red: number | null };
    tackles: { total: number | null; interceptions: number | null };
    dribbles: { success: number | null };
  }>;
}

export interface OraclePlayerStats {
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

export interface GameweekStatsResult {
  gameweekId: number;
  players: OraclePlayerStats[];
  fixtures: string[];
  errors: string[];
}

async function loadPlayerMappings(): Promise<Map<number, { id: number; position: string }>> {
  if (playerMappings) return playerMappings;

  try {
    const response = await fetch("/data/players.json");
    const players = await response.json();
    playerMappings = new Map();

    for (const player of players) {
      if (player.apiId) {
        const posId =
          player.position === "GK" ? 0 :
          player.position === "DEF" ? 1 :
          player.position === "MID" ? 2 : 3;
        playerMappings.set(player.apiId, { id: player.id, position: player.position });
      }
    }

    return playerMappings;
  } catch (error) {
    console.error("Failed to load player mappings:", error);
    return new Map();
  }
}

function mapApiPosition(pos: string): number {
  if (pos === "G") return 0;
  if (pos === "D") return 1;
  if (pos === "M") return 2;
  if (pos === "F") return 3;
  return 2;
}

export async function fetchGameweekStats(
  apiKey: string,
  gameweekNumber: number
): Promise<GameweekStatsResult> {
  const result: GameweekStatsResult = {
    gameweekId: gameweekNumber,
    players: [],
    fixtures: [],
    errors: [],
  };

  if (!apiKey) {
    result.errors.push("API key is required");
    return result;
  }

  const headers = { "x-apisports-key": apiKey };
  const mappings = await loadPlayerMappings();

  try {
    // 1. Get fixtures for the round
    const round = `Regular Season - ${gameweekNumber}`;
    const fixturesUrl = `${API_BASE_URL}/fixtures?league=${EPL_LEAGUE_ID}&season=${SEASON}&round=${encodeURIComponent(round)}`;

    const fixturesRes = await fetch(fixturesUrl, { headers });

    // Check for rate limiting
    if (fixturesRes.status === 429) {
      result.errors.push("API rate limit exceeded. Free tier allows 100 requests/day. Try again tomorrow.");
      return result;
    }

    if (!fixturesRes.ok) {
      result.errors.push(`API request failed: ${fixturesRes.status} ${fixturesRes.statusText}`);
      return result;
    }

    const fixturesData = await fixturesRes.json();

    // Check for API-level errors (including rate limits in response body)
    if (fixturesData.errors && Object.keys(fixturesData.errors).length > 0) {
      const errorMessages = Object.entries(fixturesData.errors)
        .map(([key, value]) => `${key}: ${value}`)
        .join("; ");

      if (errorMessages.toLowerCase().includes("rate") || errorMessages.toLowerCase().includes("limit")) {
        result.errors.push(`Rate limit exceeded: ${errorMessages}. Free tier allows 100 requests/day.`);
      } else {
        result.errors.push(`API Error: ${errorMessages}`);
      }
      return result;
    }

    const fixtures: ApiFixture[] = fixturesData.response || [];
    const completedFixtures = fixtures.filter(
      (f) => f.fixture.status.short === "FT" || f.fixture.status.short === "AET"
    );

    if (completedFixtures.length === 0) {
      result.errors.push(`No completed fixtures found for Gameweek ${gameweekNumber}`);
      return result;
    }

    // Track clean sheets
    const cleanSheetTeams = new Set<number>();
    for (const fixture of completedFixtures) {
      result.fixtures.push(`${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
      if (fixture.goals.home === 0) cleanSheetTeams.add(fixture.teams.away.id);
      if (fixture.goals.away === 0) cleanSheetTeams.add(fixture.teams.home.id);
    }

    // 2. Get player stats for each fixture
    for (const fixture of completedFixtures) {
      try {
        const statsUrl = `${API_BASE_URL}/fixtures/players?fixture=${fixture.fixture.id}`;
        const statsRes = await fetch(statsUrl, { headers });
        const statsData = await statsRes.json();

        if (!statsData.response) continue;

        for (const teamData of statsData.response) {
          const teamId = teamData.team.id;
          const hadCleanSheet = cleanSheetTeams.has(teamId);

          for (const playerData of teamData.players as ApiPlayerStats[]) {
            const stats = playerData.statistics[0];
            if (!stats || !stats.games.minutes) continue;

            const mapping = mappings.get(playerData.player.id);
            if (!mapping) continue; // Skip players not in our database

            const positionId =
              mapping.position === "GK" ? 0 :
              mapping.position === "DEF" ? 1 :
              mapping.position === "MID" ? 2 : 3;

            const cleanSheet =
              hadCleanSheet &&
              stats.games.minutes >= 60 &&
              (positionId === 0 || positionId === 1);

            result.players.push({
              playerId: mapping.id,
              position: positionId,
              minutesPlayed: stats.games.minutes || 0,
              goals: stats.goals?.total || 0,
              assists: stats.goals?.assists || 0,
              cleanSheet,
              saves: stats.goals?.saves || 0,
              penaltiesSaved: stats.penalty?.saved || 0,
              penaltiesMissed: stats.penalty?.missed || 0,
              ownGoals: 0,
              yellowCards: stats.cards?.yellow || 0,
              redCards: stats.cards?.red || 0,
              rating: Math.round(parseFloat(stats.games.rating || "6.0") * 10),
              tackles: stats.tackles?.total || 0,
              interceptions: stats.tackles?.interceptions || 0,
              successfulDribbles: stats.dribbles?.success || 0,
              freeKickGoals: 0,
            });
          }
        }

        // Rate limiting - wait between fixture requests
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        result.errors.push(`Error fetching fixture ${fixture.fixture.id}: ${err}`);
      }
    }
  } catch (error) {
    result.errors.push(`Failed to fetch gameweek stats: ${error}`);
  }

  return result;
}

export async function checkApiStatus(apiKey: string): Promise<{
  valid: boolean;
  requestsUsed: number;
  requestsLimit: number;
  requestsRemaining: number;
  warning?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/status`, {
      headers: { "x-apisports-key": apiKey },
    });

    if (res.status === 429) {
      return {
        valid: false,
        requestsUsed: 0,
        requestsLimit: 100,
        requestsRemaining: 0,
        error: "Rate limit exceeded. Try again tomorrow.",
      };
    }

    const data = await res.json();

    if (data.response) {
      const used = data.response.requests?.current || 0;
      const limit = data.response.requests?.limit_day || 100;
      const remaining = limit - used;

      let warning: string | undefined;
      if (remaining < 15) {
        warning = `Low on API requests! Only ${remaining} remaining today. Fetching 1 gameweek uses ~11 requests.`;
      }

      return {
        valid: true,
        requestsUsed: used,
        requestsLimit: limit,
        requestsRemaining: remaining,
        warning,
      };
    }

    return {
      valid: false,
      requestsUsed: 0,
      requestsLimit: 0,
      requestsRemaining: 0,
      error: "Invalid API key or response",
    };
  } catch (error) {
    return {
      valid: false,
      requestsUsed: 0,
      requestsLimit: 0,
      requestsRemaining: 0,
      error: String(error),
    };
  }
}
