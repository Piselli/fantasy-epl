"use client";

import { TITLE_TYPES, MULTIPLIER_DISPLAY } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface TitleCardProps {
  titleType: number;
  multiplier: number;
  showDescription?: boolean;
  className?: string;
}

export function TitleCard({
  titleType,
  multiplier,
  showDescription = true,
  className,
}: TitleCardProps) {
  const titleInfo = TITLE_TYPES[titleType as keyof typeof TITLE_TYPES];
  const multiplierDisplay = MULTIPLIER_DISPLAY[multiplier as keyof typeof MULTIPLIER_DISPLAY] || `${multiplier / 100}%`;

  const isDefensive = titleType <= 1;

  return (
    <div
      className={cn(
        "p-4 rounded-xl border-2 transition-all hover:scale-[1.02]",
        isDefensive
          ? "border-blue-500/50 bg-blue-500/10"
          : "border-orange-500/50 bg-orange-500/10",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full border",
              isDefensive
                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                : "bg-orange-500/20 text-orange-400 border-orange-500/30"
            )}
          >
            {titleInfo?.category || "Unknown"}
          </span>
          <h3 className="text-lg font-bold text-foreground mt-2">
            {titleInfo?.name || `Title ${titleType}`}
          </h3>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
            {multiplierDisplay}
          </span>
          <p className="text-xs text-muted-foreground">Multiplier</p>
        </div>
      </div>
      {showDescription && titleInfo?.description && (
        <p className="mt-3 text-sm text-muted-foreground">{titleInfo.description}</p>
      )}
    </div>
  );
}
