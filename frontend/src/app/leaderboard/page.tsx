"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { getConfig, getGameweek, getTeamResult } from "@/lib/aptos";
import { formatMOVE, cn } from "@/lib/utils";
import { TeamResult } from "@/lib/types";

// Mock leaderboard data for demo (in production, this would come from indexer/events)
const MOCK_RESULTS: (TeamResult & { owner: string })[] = [
  {
    owner: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    basePoints: 68,
    ratingBonus: 4,
    titleTriggered: true,
    titleMultiplier: 1000,
    guildTriggered: true,
    guildMultiplier: 500,
    finalPoints: 88,
    rank: 1,
    prizeAmount: 250000000,
    claimed: false,
  },
  {
    owner: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
    basePoints: 65,
    ratingBonus: 3,
    titleTriggered: true,
    titleMultiplier: 1500,
    guildTriggered: false,
    guildMultiplier: 0,
    finalPoints: 78,
    rank: 2,
    prizeAmount: 150000000,
    claimed: true,
  },
  {
    owner: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
    basePoints: 62,
    ratingBonus: 2,
    titleTriggered: false,
    titleMultiplier: 0,
    guildTriggered: true,
    guildMultiplier: 1000,
    finalPoints: 70,
    rank: 3,
    prizeAmount: 100000000,
    claimed: false,
  },
  {
    owner: "0x5555555555555555555555555555555555555555555555555555555555555555",
    basePoints: 58,
    ratingBonus: 1,
    titleTriggered: false,
    titleMultiplier: 0,
    guildTriggered: false,
    guildMultiplier: 0,
    finalPoints: 59,
    rank: 4,
    prizeAmount: 0,
    claimed: false,
  },
  {
    owner: "0x6666666666666666666666666666666666666666666666666666666666666666",
    basePoints: 54,
    ratingBonus: -1,
    titleTriggered: true,
    titleMultiplier: 500,
    guildTriggered: false,
    guildMultiplier: 0,
    finalPoints: 56,
    rank: 5,
    prizeAmount: 0,
    claimed: false,
  },
];

export default function LeaderboardPage() {
  const { account } = useWallet();
  const [config, setConfig] = useState<any>(null);
  const [currentGameweek, setCurrentGameweek] = useState<any>(null);
  const [selectedGameweek, setSelectedGameweek] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const configData = await getConfig();
      setConfig(configData);

      if (configData?.currentGameweek) {
        setSelectedGameweek(configData.currentGameweek);
        const gwData = await getGameweek(configData.currentGameweek);
        setCurrentGameweek(gwData);
      }
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const userResult = account?.address
    ? MOCK_RESULTS.find((r) => r.owner === account.address.toString())
    : null;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="glass-card rounded-2xl p-12">
          <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">See how you rank against other managers</p>
        </div>

        <div className="glass-card flex items-center gap-3 px-4 py-3 rounded-xl">
          <label className="text-muted-foreground text-sm">Gameweek:</label>
          <select
            value={selectedGameweek}
            onChange={(e) => setSelectedGameweek(Number(e.target.value))}
            className="bg-secondary text-foreground px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border border-border"
          >
            {Array.from({ length: config?.currentGameweek || 1 }, (_, i) => i + 1).map((gw) => (
              <option key={gw} value={gw}>
                GW {gw}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gameweek Summary */}
      {currentGameweek && (
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm mb-2">Status</p>
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold",
              currentGameweek.status === "open" && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
              currentGameweek.status === "closed" && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
              currentGameweek.status === "resolved" && "bg-blue-500/20 text-blue-400 border border-blue-500/30"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full",
                currentGameweek.status === "open" && "bg-emerald-400 animate-pulse",
                currentGameweek.status === "closed" && "bg-amber-400",
                currentGameweek.status === "resolved" && "bg-blue-400"
              )} />
              {currentGameweek.status.toUpperCase()}
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm mb-2">Prize Pool</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
              {formatMOVE(currentGameweek.prizePool)} MOVE
            </p>
          </div>
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm mb-2">Total Entries</p>
            <p className="text-3xl font-bold text-white">
              {currentGameweek.totalEntries}
            </p>
          </div>
        </div>
      )}

      {/* User's Result Highlight */}
      {userResult && (
        <div className="glass-card rounded-2xl p-6 mb-8 border-2 border-emerald-500/50 glow-green">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h2 className="text-lg font-bold text-emerald-400">Your Result</h2>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="stat-card px-4 py-3 rounded-xl">
              <p className={cn(
                "text-3xl font-bold",
                userResult.rank === 1 && "rank-gold",
                userResult.rank === 2 && "rank-silver",
                userResult.rank === 3 && "rank-bronze",
                userResult.rank > 3 && "text-white"
              )}>
                #{userResult.rank}
              </p>
              <p className="text-sm text-muted-foreground">Rank</p>
            </div>
            <div className="stat-card px-4 py-3 rounded-xl">
              <p className="text-3xl font-bold text-white">{userResult.finalPoints}</p>
              <p className="text-sm text-muted-foreground">Points</p>
            </div>
            <div className="stat-card px-4 py-3 rounded-xl">
              <p className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                {userResult.prizeAmount > 0 ? formatMOVE(userResult.prizeAmount) : "-"}
              </p>
              <p className="text-sm text-muted-foreground">Prize (MOVE)</p>
            </div>
            <div className="flex items-center justify-center">
              {userResult.prizeAmount > 0 && !userResult.claimed && (
                <button className="btn-primary px-6 py-3 rounded-xl font-medium">
                  Claim Prize
                </button>
              )}
              {userResult.claimed && (
                <span className="flex items-center gap-2 text-emerald-400 font-medium">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Claimed
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prize Distribution Info */}
      <div className="glass-card rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-6 text-center">Prize Distribution</h2>
        <div className="flex justify-center gap-8">
          <div className="text-center group">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-500 flex items-center justify-center text-2xl font-bold text-yellow-900 mx-auto mb-3 shadow-lg shadow-amber-500/30 group-hover:shadow-amber-500/50 transition-shadow">
              1
            </div>
            <p className="text-2xl font-bold rank-gold">50%</p>
            <p className="text-sm text-muted-foreground">of pool</p>
          </div>
          <div className="text-center group">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-300 to-slate-400 flex items-center justify-center text-2xl font-bold text-gray-700 mx-auto mb-3 shadow-lg shadow-slate-400/30 group-hover:shadow-slate-400/50 transition-shadow">
              2
            </div>
            <p className="text-2xl font-bold rank-silver">30%</p>
            <p className="text-sm text-muted-foreground">of pool</p>
          </div>
          <div className="text-center group">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-300 to-amber-600 flex items-center justify-center text-2xl font-bold text-orange-900 mx-auto mb-3 shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">
              3
            </div>
            <p className="text-2xl font-bold rank-bronze">20%</p>
            <p className="text-sm text-muted-foreground">of pool</p>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <LeaderboardTable
          results={MOCK_RESULTS}
          currentUser={account?.address?.toString()}
        />
      </div>

      <p className="text-center text-muted-foreground text-sm mt-6 glass-card rounded-xl py-4 px-6">
        Results are updated after the oracle publishes gameweek stats.
        This is demo data - connect your wallet and register a team to see real results.
      </p>
    </div>
  );
}
