"use client";

import { Player } from "@/lib/types";
import { PlayerCard } from "./PlayerCard";
import { cn } from "@/lib/utils";

interface FormationGridProps {
  starters: (Player | null)[];
  bench: (Player | null)[];
  captain: Player | null;
  onPlayerClick?: (index: number, isBench: boolean) => void;
  onCaptainSelect?: (player: Player) => void;
}

export function FormationGrid({
  starters,
  bench,
  captain,
  onPlayerClick,
  onCaptainSelect,
}: FormationGridProps) {
  // Formation: 4-3-3
  // Index 0: GK
  // Index 1-4: DEF
  // Index 5-7: MID
  // Index 8-10: FWD

  const renderSlot = (
    player: Player | null,
    index: number,
    isBench: boolean = false
  ) => {
    const position = isBench
      ? ["DEF", "MID", "FWD"][index]
      : index === 0
      ? "GK"
      : index <= 4
      ? "DEF"
      : index <= 7
      ? "MID"
      : "FWD";

    const positionColors: Record<string, string> = {
      GK: "border-amber-500/40 text-amber-400",
      DEF: "border-blue-500/40 text-blue-400",
      MID: "border-emerald-500/40 text-emerald-400",
      FWD: "border-rose-500/40 text-rose-400",
    };

    if (!player) {
      return (
        <div
          key={`slot-${isBench ? "bench" : "start"}-${index}`}
          onClick={() => onPlayerClick?.(index, isBench)}
          className={cn(
            "w-20 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105",
            positionColors[position],
            "bg-black/20 backdrop-blur-sm hover:bg-black/30"
          )}
        >
          <span className="text-sm font-medium">{position}</span>
          <span className="text-xs opacity-60">Empty</span>
        </div>
      );
    }

    return (
      <div
        key={`slot-${isBench ? "bench" : "start"}-${index}`}
        onClick={() => onPlayerClick?.(index, isBench)}
        className="cursor-pointer transition-all hover:scale-105"
      >
        <PlayerCard
          player={player}
          selected={true}
          isCaptain={captain?.id === player.id}
          compact
          onCaptainClick={
            !isBench && onCaptainSelect
              ? () => onCaptainSelect(player)
              : undefined
          }
        />
      </div>
    );
  };

  return (
    <div className="relative bg-gradient-to-b from-emerald-700 via-emerald-800 to-green-900 rounded-2xl p-6 overflow-hidden">
      {/* Field pattern overlay */}
      <div className="absolute inset-0 field-pattern opacity-30" />

      {/* Field markings */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/20 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/30 rounded-full" />

        {/* Center line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10" />

        {/* Top penalty box */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-20 border-2 border-white/15 border-t-0 rounded-b-lg" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-8 border-2 border-white/10 border-t-0" />

        {/* Bottom penalty box */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-20 border-2 border-white/15 border-b-0 rounded-t-lg" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-8 border-2 border-white/10 border-b-0" />

        {/* Corner arcs */}
        <div className="absolute top-0 left-0 w-6 h-6 border-2 border-white/10 border-t-0 border-l-0 rounded-br-full" />
        <div className="absolute top-0 right-0 w-6 h-6 border-2 border-white/10 border-t-0 border-r-0 rounded-bl-full" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-2 border-white/10 border-b-0 border-l-0 rounded-tr-full" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-2 border-white/10 border-b-0 border-r-0 rounded-tl-full" />
      </div>

      {/* Formation layout */}
      <div className="relative space-y-6">
        {/* Forwards (3) */}
        <div className="flex justify-center gap-8">
          {[8, 9, 10].map((i) => renderSlot(starters[i], i))}
        </div>

        {/* Midfielders (3) */}
        <div className="flex justify-center gap-8">
          {[5, 6, 7].map((i) => renderSlot(starters[i], i))}
        </div>

        {/* Defenders (4) */}
        <div className="flex justify-center gap-6">
          {[1, 2, 3, 4].map((i) => renderSlot(starters[i], i))}
        </div>

        {/* Goalkeeper (1) */}
        <div className="flex justify-center">
          {renderSlot(starters[0], 0)}
        </div>
      </div>

      {/* Bench */}
      <div className="relative mt-8 pt-6 border-t border-white/20">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h4 className="text-white/80 text-sm font-medium">Substitutes</h4>
        </div>
        <div className="flex justify-center gap-4">
          {bench.map((player, i) => renderSlot(player, i, true))}
        </div>
      </div>
    </div>
  );
}
