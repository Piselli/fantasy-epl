/**
 * Fetch all EPL players from API-Sports and generate players.json
 *
 * Usage:
 *   API_SPORTS_KEY=your_key npx ts-node fetch-players.ts
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { API_CONFIG, EPL_TEAMS, mapPosition, estimatePrice, fetchFromApi } from "./api-config";

interface ApiSquadResponse {
  response: Array<{
    team: { id: number; name: string };
    players: Array<{
      id: number;
      name: string;
      age: number;
      number: number | null;
      position: string;
      photo: string;
    }>;
  }>;
}

interface Player {
  id: number;
  apiId: number;
  name: string;
  team: string;
  teamId: number;
  apiTeamId: number;
  position: string;
  positionId: number;
  price: number;
  photo: string;
}

async function fetchAllPlayers(): Promise<Player[]> {
  const allPlayers: Player[] = [];
  let playerId = 1;
  let teamIndex = 1;

  const teamIds = Object.keys(EPL_TEAMS).map(Number);

  console.log(`Fetching squads for ${teamIds.length} EPL teams...`);

  for (const apiTeamId of teamIds) {
    const teamInfo = EPL_TEAMS[apiTeamId];
    console.log(`  Fetching ${teamInfo.name}...`);

    try {
      const data = await fetchFromApi<ApiSquadResponse>(`/players/squads?team=${apiTeamId}`);

      if (data.response && data.response[0]?.players) {
        const players = data.response[0].players;

        for (const apiPlayer of players) {
          // Skip players without a clear position
          if (!apiPlayer.position) continue;

          const { position, positionId } = mapPosition(apiPlayer.position);
          const price = estimatePrice(position, apiTeamId);

          allPlayers.push({
            id: playerId++,
            apiId: apiPlayer.id,
            name: apiPlayer.name,
            team: teamInfo.name,
            teamId: teamIndex,
            apiTeamId: apiTeamId,
            position,
            positionId,
            price,
            photo: apiPlayer.photo,
          });
        }
      }

      teamIndex++;

      // Rate limiting: API allows 10 requests per minute on free tier
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`  Error fetching ${teamInfo.name}:`, error);
    }
  }

  return allPlayers;
}

async function main() {
  console.log("=== EPL Player Fetcher ===\n");

  if (!API_CONFIG.apiKey) {
    console.error("Error: API_SPORTS_KEY environment variable is required");
    console.error("Usage: API_SPORTS_KEY=your_key npx ts-node fetch-players.ts");
    process.exit(1);
  }

  try {
    const players = await fetchAllPlayers();

    // Sort by position, then by team
    players.sort((a, b) => {
      if (a.positionId !== b.positionId) return a.positionId - b.positionId;
      return a.teamId - b.teamId;
    });

    // Write to players.json
    const outputPath = join(__dirname, "../frontend/src/data/players.json");
    writeFileSync(outputPath, JSON.stringify(players, null, 2));

    console.log(`\nSuccess! Wrote ${players.length} players to ${outputPath}`);

    // Summary
    const summary = {
      GK: players.filter((p) => p.position === "GK").length,
      DEF: players.filter((p) => p.position === "DEF").length,
      MID: players.filter((p) => p.position === "MID").length,
      FWD: players.filter((p) => p.position === "FWD").length,
    };
    console.log("\nBy position:", summary);
  } catch (error) {
    console.error("Failed to fetch players:", error);
    process.exit(1);
  }
}

main();
