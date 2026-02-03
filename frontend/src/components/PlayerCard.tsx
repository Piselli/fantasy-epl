"use client";

import { Player } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PlayerCardProps {
  player: Player;
  selected?: boolean;
  isCaptain?: boolean;
  onClick?: () => void;
  onCaptainClick?: () => void;
  showPrice?: boolean;
  compact?: boolean;
}

const positionColors = {
  GK: "from-amber-400 to-yellow-600",
  DEF: "from-blue-400 to-indigo-600",
  MID: "from-emerald-400 to-green-600",
  FWD: "from-rose-400 to-red-600",
};

const positionBadgeColors = {
  GK: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DEF: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  MID: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  FWD: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

export function PlayerCard({
  player,
  selected = false,
  isCaptain = false,
  onClick,
  onCaptainClick,
  showPrice = true,
  compact = false,
}: PlayerCardProps) {
  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "p-2 rounded-xl cursor-pointer transition-all",
          selected
            ? "bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-500/50"
            : "bg-secondary/50 hover:bg-secondary/80 border border-transparent",
          "flex flex-col items-center gap-1"
        )}
      >
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br shadow-lg",
          positionColors[player.position]
        )}>
          {player.position}
        </div>
        <span className="text-xs font-medium text-center truncate w-full text-foreground">
          {player.name.split(" ").pop()}
        </span>
        {isCaptain && (
          <span className="text-xs bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">C</span>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl cursor-pointer transition-all border-2",
        selected
          ? "border-emerald-500/50 bg-emerald-500/10"
          : "border-transparent bg-secondary/50 hover:border-border hover:bg-secondary/80"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold bg-gradient-to-br shadow-lg",
            positionColors[player.position]
          )}
        >
          {player.position}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{player.name}</p>
          <p className="text-sm text-muted-foreground">{player.team}</p>
        </div>
        {showPrice && (
          <div className="text-right">
            <p className="font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">{player.price.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">MOVE</p>
          </div>
        )}
      </div>
      {selected && onCaptainClick && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCaptainClick();
          }}
          className={cn(
            "mt-3 w-full py-2 rounded-lg text-sm font-medium transition-all",
            isCaptain
              ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/25"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
        >
          {isCaptain ? "Captain" : "Make Captain"}
        </button>
      )}
    </div>
  );
}
