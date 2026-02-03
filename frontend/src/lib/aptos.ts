import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import { NETWORK, MODULE_ADDRESS, MODULE_NAME, MOVEMENT_TESTNET_URL } from "./constants";

const config = new AptosConfig({
  network: NETWORK,
  fullnode: MOVEMENT_TESTNET_URL,
});
export const aptos = new Aptos(config);

// Helper to build module function name
export const moduleFunction = (functionName: string): `${string}::${string}::${string}` => {
  return `${MODULE_ADDRESS}::${MODULE_NAME}::${functionName}` as `${string}::${string}::${string}`;
};

// View function helpers
export async function getConfig() {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("get_config"),
        typeArguments: [],
        functionArguments: [],
      },
    });
    return {
      admins: result[0] as string[],  // Now returns array of admins
      oracle: result[1] as string,
      entryFee: Number(result[2]),
      titleFee: Number(result[3]),
      guildFee: Number(result[4]),
      prizePoolPercent: Number(result[5]),
      currentGameweek: Number(result[6]),
    };
  } catch (e) {
    console.error("Failed to get config:", e);
    return null;
  }
}

export async function isAdmin(address: string) {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("is_admin_address"),
        typeArguments: [],
        functionArguments: [address],
      },
    });
    return result[0] as boolean;
  } catch (e) {
    return false;
  }
}

export async function getGameweek(gameweekId: number) {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("get_gameweek"),
        typeArguments: [],
        functionArguments: [gameweekId.toString()],
      },
    });
    return {
      id: Number(result[0]),
      status: Number(result[1]) === 0 ? "open" : Number(result[1]) === 1 ? "closed" : "resolved",
      prizePool: Number(result[2]),
      totalEntries: Number(result[3]),
    };
  } catch (e) {
    console.error("Failed to get gameweek:", e);
    return null;
  }
}

export async function getUserTitle(owner: string) {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("get_user_title"),
        typeArguments: [],
        functionArguments: [owner],
      },
    });
    return {
      titleType: Number(result[0]),
      multiplier: Number(result[1]),
      season: Number(result[2]),
    };
  } catch (e) {
    return null;
  }
}

export async function getUserGuild(owner: string) {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("get_user_guild"),
        typeArguments: [],
        functionArguments: [owner],
      },
    });
    return {
      multiplier: Number(result[0]),
      season: Number(result[1]),
    };
  } catch (e) {
    return null;
  }
}

export async function hasTitle(owner: string): Promise<boolean> {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("has_title"),
        typeArguments: [],
        functionArguments: [owner],
      },
    });
    return result[0] as boolean;
  } catch (e) {
    return false;
  }
}

export async function hasGuild(owner: string): Promise<boolean> {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("has_guild"),
        typeArguments: [],
        functionArguments: [owner],
      },
    });
    return result[0] as boolean;
  } catch (e) {
    return false;
  }
}

export async function hasRegisteredTeam(owner: string, gameweekId: number): Promise<boolean> {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("has_registered_team"),
        typeArguments: [],
        functionArguments: [owner, gameweekId.toString()],
      },
    });
    return result[0] as boolean;
  } catch (e) {
    return false;
  }
}

export async function getTeamResult(owner: string, gameweekId: number) {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("get_team_result"),
        typeArguments: [],
        functionArguments: [owner, gameweekId.toString()],
      },
    });
    const ratingBonus = Number(result[1]);
    const ratingBonusNegative = result[2] as boolean;
    return {
      basePoints: Number(result[0]),
      ratingBonus: ratingBonusNegative ? -ratingBonus : ratingBonus,
      titleTriggered: result[3] as boolean,
      titleMultiplier: Number(result[4]),
      guildTriggered: result[5] as boolean,
      guildMultiplier: Number(result[6]),
      finalPoints: Number(result[7]),
      rank: Number(result[8]),
      prizeAmount: Number(result[9]),
      claimed: result[10] as boolean,
    };
  } catch (e) {
    return null;
  }
}
