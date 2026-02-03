"use client";

import { TeamResult } from "@/lib/types";
import { shortenAddress, formatMOVE, getMultiplierDisplay } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface LeaderboardTableProps {
  results: (TeamResult & { owner: string })[];
  currentUser?: string;
}

export function LeaderboardTable({ results, currentUser }: LeaderboardTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-4 px-4 text-muted-foreground font-medium text-sm">Rank</th>
            <th className="text-left py-4 px-4 text-muted-foreground font-medium text-sm">Manager</th>
            <th className="text-right py-4 px-4 text-muted-foreground font-medium text-sm">Base</th>
            <th className="text-right py-4 px-4 text-muted-foreground font-medium text-sm">Rating</th>
            <th className="text-right py-4 px-4 text-muted-foreground font-medium text-sm">Title</th>
            <th className="text-right py-4 px-4 text-muted-foreground font-medium text-sm">Guild</th>
            <th className="text-right py-4 px-4 text-muted-foreground font-medium text-sm">Final</th>
            <th className="text-right py-4 px-4 text-muted-foreground font-medium text-sm">Prize</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr
              key={result.owner}
              className={cn(
                "border-b border-border/50 hover:bg-secondary/30 transition-colors",
                currentUser === result.owner && "bg-emerald-500/10"
              )}
            >
              <td className="py-4 px-4">
                <span
                  className={cn(
                    "font-bold text-lg",
                    result.rank === 1 && "rank-gold",
                    result.rank === 2 && "rank-silver",
                    result.rank === 3 && "rank-bronze",
                    result.rank > 3 && "text-foreground"
                  )}
                >
                  #{result.rank}
                </span>
              </td>
              <td className="py-4 px-4">
                <span className={cn(
                  "font-mono text-sm",
                  currentUser === result.owner ? "text-emerald-400" : "text-foreground"
                )}>
                  {shortenAddress(result.owner)}
                  {currentUser === result.owner && (
                    <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      You
                    </span>
                  )}
                </span>
              </td>
              <td className="py-4 px-4 text-right text-foreground">
                {result.basePoints}
              </td>
              <td className="py-4 px-4 text-right">
                <span className={cn(
                  "font-medium",
                  result.ratingBonus > 0 && "text-emerald-400",
                  result.ratingBonus < 0 && "text-destructive",
                  result.ratingBonus === 0 && "text-muted-foreground"
                )}>
                  {result.ratingBonus > 0 ? "+" : ""}{result.ratingBonus}
                </span>
              </td>
              <td className="py-4 px-4 text-right">
                {result.titleTriggered ? (
                  <span className="text-emerald-400 font-medium">
                    +{getMultiplierDisplay(result.titleMultiplier)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="py-4 px-4 text-right">
                {result.guildTriggered ? (
                  <span className="text-emerald-400 font-medium">
                    +{getMultiplierDisplay(result.guildMultiplier)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="py-4 px-4 text-right">
                <span className="font-bold text-foreground text-lg">
                  {result.finalPoints}
                </span>
              </td>
              <td className="py-4 px-4 text-right">
                {result.prizeAmount > 0 ? (
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-medium bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                      {formatMOVE(result.prizeAmount)} MOVE
                    </span>
                    {result.claimed && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Claimed
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
