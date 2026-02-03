/**
 * Fetch player stats for a gameweek from API-Sports
 * Transforms the data into oracle submission format for the Move contract
 *
 * Usage:
 *   API_SPORTS_KEY=your_key npx ts-node fetch-gameweek-stats.ts [round]
 *
 * Example:
 *   API_SPORTS_KEY=your_key npx ts-node fetch-gameweek-stats.ts 23
 */

import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { API_CONFIG, fetchFromApi } from "./api-config";

interface FixturesResponse {
  response: Array<{
    fixture: {
      id: number;
      date: string;
      status: { short: string };
    };
    teams: {
      home: { id: number; name: string };
      away: { id: number; name: string };
    };
    goals: {
      home: number;
      away: number;
    };
  }>;
}

interface FixturePlayersResponse {
  response: Array<{
    team: { id: number; name: string };
    players: Array<{
      player: { id: number; name: string };
      statistics: Array<{
        games: {
          minutes: number | null;
          position: string;
          rating: string | null;
        };
        goals: {
          total: number | null;
          assists: number | null;
          saves: number | null;
        };
        penalty: {
          scored: number | null;
          missed: number | null;
          saved: number | null;
        };
        cards: {
          yellow: number | null;
          red: number | null;
        };
        tackles: {
          total: number | null;
          interceptions: number | null;
        };
        fouls: {
          committed: number | null;
        };
      }>;
    }>;
  }>;
}

// Oracle submission format matching the Move contract
interface OraclePlayerStats {
  player_id: number;
  gameweek_id: number;
  minutes_played: number;
  goals_scored: number;
  assists: number;
  clean_sheet: boolean;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_card: boolean;
  saves: number;
  rating: number; // Multiplied by 10 (e.g., 7.5 = 75)
}

interface PlayerMapping {
  id: number;
  apiId: number;
  name: string;
  position: string;
}

async function getGameweekRound(): Promise<string> {
  // Get the current round from API
  const data = await fetchFromApi<{ response: string[] }>(
    `/fixtures/rounds?league=${API_CONFIG.leagueId}&season=${API_CONFIG.season}&current=true`
  );
  return data.response[0] || "Regular Season - 1";
}

async function getFixturesForRound(round: string): Promise<FixturesResponse["response"]> {
  const data = await fetchFromApi<FixturesResponse>(
    `/fixtures?league=${API_CONFIG.leagueId}&season=${API_CONFIG.season}&round=${encodeURIComponent(round)}`
  );
  return data.response || [];
}

async function getPlayerStatsForFixture(fixtureId: number): Promise<FixturePlayersResponse["response"]> {
  const data = await fetchFromApi<FixturePlayersResponse>(`/fixtures/players?fixture=${fixtureId}`);
  return data.response || [];
}

function loadPlayerMappings(): Map<number, PlayerMapping> {
  const playersPath = join(__dirname, "../frontend/src/data/players.json");
  try {
    const data = JSON.parse(readFileSync(playersPath, "utf-8"));
    const mapping = new Map<number, PlayerMapping>();
    for (const player of data) {
      if (player.apiId) {
        mapping.set(player.apiId, {
          id: player.id,
          apiId: player.apiId,
          name: player.name,
          position: player.position,
        });
      }
    }
    return mapping;
  } catch (error) {
    console.warn("Could not load player mappings from players.json");
    return new Map();
  }
}

async function fetchGameweekStats(roundNumber?: number): Promise<OraclePlayerStats[]> {
  const round = roundNumber
    ? `Regular Season - ${roundNumber}`
    : await getGameweekRound();

  console.log(`Fetching stats for: ${round}`);

  const fixtures = await getFixturesForRound(round);
  console.log(`Found ${fixtures.length} fixtures`);

  // Filter to only completed matches
  const completedFixtures = fixtures.filter(
    (f) => f.fixture.status.short === "FT" || f.fixture.status.short === "AET" || f.fixture.status.short === "PEN"
  );

  console.log(`${completedFixtures.length} completed fixtures`);

  const playerMappings = loadPlayerMappings();
  const allStats: OraclePlayerStats[] = [];
  const gameweekId = roundNumber || parseInt(round.match(/\d+/)?.[0] || "1");

  // Track clean sheets by team
  const cleanSheetTeams = new Set<number>();
  for (const fixture of completedFixtures) {
    if (fixture.goals.home === 0) cleanSheetTeams.add(fixture.teams.away.id);
    if (fixture.goals.away === 0) cleanSheetTeams.add(fixture.teams.home.id);
  }

  // Track goals conceded by team
  const goalsConcededByTeam = new Map<number, number>();
  for (const fixture of completedFixtures) {
    goalsConcededByTeam.set(
      fixture.teams.home.id,
      (goalsConcededByTeam.get(fixture.teams.home.id) || 0) + (fixture.goals.away || 0)
    );
    goalsConcededByTeam.set(
      fixture.teams.away.id,
      (goalsConcededByTeam.get(fixture.teams.away.id) || 0) + (fixture.goals.home || 0)
    );
  }

  for (const fixture of completedFixtures) {
    console.log(
      `  Processing: ${fixture.teams.home.name} vs ${fixture.teams.away.name}`
    );

    await new Promise((resolve) => setTimeout(resolve, 1000)); // Rate limiting

    try {
      const fixtureStats = await getPlayerStatsForFixture(fixture.fixture.id);

      for (const teamData of fixtureStats) {
        const teamId = teamData.team.id;
        const hadCleanSheet = cleanSheetTeams.has(teamId);
        const goalsConceded = goalsConcededByTeam.get(teamId) || 0;

        for (const playerData of teamData.players) {
          const stats = playerData.statistics[0];
          if (!stats || !stats.games.minutes) continue;

          const mapping = playerMappings.get(playerData.player.id);

          // Skip players not in our database
          if (!mapping) {
            continue;
          }

          const playerId = mapping.id;
          const position = mapping.position;

          // Only count clean sheet for GK/DEF who played 60+ minutes
          const cleanSheet =
            hadCleanSheet &&
            stats.games.minutes >= 60 &&
            (position === "GK" || position === "DEF");

          const oracleStats: OraclePlayerStats = {
            player_id: playerId,
            gameweek_id: gameweekId,
            minutes_played: stats.games.minutes || 0,
            goals_scored: stats.goals?.total || 0,
            assists: stats.goals?.assists || 0,
            clean_sheet: cleanSheet,
            goals_conceded: position === "GK" || position === "DEF" ? goalsConceded : 0,
            own_goals: 0, // API doesn't provide this directly
            penalties_saved: stats.penalty?.saved || 0,
            penalties_missed: stats.penalty?.missed || 0,
            yellow_cards: stats.cards?.yellow || 0,
            red_card: (stats.cards?.red || 0) > 0,
            saves: stats.goals?.saves || 0,
            rating: Math.round(parseFloat(stats.games.rating || "6.0") * 10),
          };

          allStats.push(oracleStats);
        }
      }
    } catch (error) {
      console.error(`  Error processing fixture ${fixture.fixture.id}:`, error);
    }
  }

  return allStats;
}

function mapApiPosition(pos: string): string {
  if (pos === "G") return "GK";
  if (pos === "D") return "DEF";
  if (pos === "M") return "MID";
  if (pos === "F") return "FWD";
  return "MID";
}

async function main() {
  console.log("=== EPL Gameweek Stats Fetcher ===\n");

  if (!API_CONFIG.apiKey) {
    console.error("Error: API_SPORTS_KEY environment variable is required");
    console.error("Usage: API_SPORTS_KEY=your_key npx ts-node fetch-gameweek-stats.ts [round]");
    process.exit(1);
  }

  const roundArg = process.argv[2];
  const roundNumber = roundArg ? parseInt(roundArg) : undefined;

  try {
    const stats = await fetchGameweekStats(roundNumber);

    // Write to gameweek-stats.json
    const outputPath = join(__dirname, `gameweek-${roundNumber || "current"}-stats.json`);
    writeFileSync(outputPath, JSON.stringify(stats, null, 2));

    console.log(`\nSuccess! Wrote stats for ${stats.length} players to ${outputPath}`);

    // Also write a summary
    const avgRating = stats.reduce((sum, s) => sum + s.rating, 0) / stats.length / 10;
    const totalGoals = stats.reduce((sum, s) => sum + s.goals_scored, 0);
    const totalAssists = stats.reduce((sum, s) => sum + s.assists, 0);

    console.log("\nSummary:");
    console.log(`  Players: ${stats.length}`);
    console.log(`  Total goals: ${totalGoals}`);
    console.log(`  Total assists: ${totalAssists}`);
    console.log(`  Average rating: ${avgRating.toFixed(2)}`);

    // Generate oracle submission format for Move contract
    console.log("\n=== Oracle Submission Format ===");
    console.log("Use this data with the admin page to submit to the contract:\n");

    // Group by a few example players
    const topPerformers = [...stats]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

    console.log("Top performers:");
    for (const p of topPerformers) {
      console.log(`  Player ${p.player_id}: ${p.rating / 10} rating, ${p.goals_scored}G ${p.assists}A`);
    }
  } catch (error) {
    console.error("Failed to fetch gameweek stats:", error);
    process.exit(1);
  }
}

main();
