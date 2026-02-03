"use client";

import { useState, useEffect, useMemo } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { FormationGrid } from "@/components/FormationGrid";
import { PlayerCard } from "@/components/PlayerCard";
import { Player } from "@/lib/types";
import { POSITIONS, MAX_PER_CLUB, FORMATION } from "@/lib/constants";
import { moduleFunction, getConfig, getGameweek, hasRegisteredTeam } from "@/lib/aptos";
import { formatMOVE, cn } from "@/lib/utils";
import playersData from "@/data/players.json";

type PositionFilter = "ALL" | "GK" | "DEF" | "MID" | "FWD";

export default function GameweekPage() {
  const { connected, account, signAndSubmitTransaction } = useWallet();

  const [starters, setStarters] = useState<(Player | null)[]>(Array(11).fill(null));
  const [bench, setBench] = useState<(Player | null)[]>(Array(3).fill(null));
  const [captain, setCaptain] = useState<Player | null>(null);
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [currentGameweek, setCurrentGameweek] = useState<any>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const players: Player[] = playersData as Player[];

  useEffect(() => {
    async function fetchData() {
      const configData = await getConfig();
      setConfig(configData);

      if (configData?.currentGameweek) {
        const gwData = await getGameweek(configData.currentGameweek);
        setCurrentGameweek(gwData);

        if (account?.address) {
          const registered = await hasRegisteredTeam(account.address.toString(), configData.currentGameweek);
          setAlreadyRegistered(registered);
        }
      }
    }
    fetchData();
  }, [account?.address]);

  const selectedPlayers = useMemo(() => {
    const all = [...starters, ...bench].filter(Boolean) as Player[];
    return new Set(all.map((p) => p.id));
  }, [starters, bench]);

  const clubCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    [...starters, ...bench].forEach((p) => {
      if (p) {
        counts[p.teamId] = (counts[p.teamId] || 0) + 1;
      }
    });
    return counts;
  }, [starters, bench]);

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (positionFilter !== "ALL" && p.position !== positionFilter) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [players, positionFilter, searchQuery]);

  const canSelectPlayer = (player: Player): boolean => {
    if (selectedPlayers.has(player.id)) return false;
    if ((clubCounts[player.teamId] || 0) >= MAX_PER_CLUB) return false;
    return true;
  };

  const getNextAvailableSlot = (position: string): { index: number; isBench: boolean } | null => {
    const posId = POSITIONS[position as keyof typeof POSITIONS];

    // Check starters first
    if (position === "GK" && !starters[0]) return { index: 0, isBench: false };
    if (position === "DEF") {
      for (let i = 1; i <= 4; i++) {
        if (!starters[i]) return { index: i, isBench: false };
      }
    }
    if (position === "MID") {
      for (let i = 5; i <= 7; i++) {
        if (!starters[i]) return { index: i, isBench: false };
      }
    }
    if (position === "FWD") {
      for (let i = 8; i <= 10; i++) {
        if (!starters[i]) return { index: i, isBench: false };
      }
    }

    // Check bench (any position except GK can be on bench)
    if (position !== "GK") {
      for (let i = 0; i < 3; i++) {
        if (!bench[i]) return { index: i, isBench: true };
      }
    }

    return null;
  };

  const handlePlayerSelect = (player: Player) => {
    if (selectedPlayers.has(player.id)) {
      // Remove player
      const starterIdx = starters.findIndex((p) => p?.id === player.id);
      if (starterIdx !== -1) {
        const newStarters = [...starters];
        newStarters[starterIdx] = null;
        setStarters(newStarters);
        if (captain?.id === player.id) setCaptain(null);
        return;
      }

      const benchIdx = bench.findIndex((p) => p?.id === player.id);
      if (benchIdx !== -1) {
        const newBench = [...bench];
        newBench[benchIdx] = null;
        setBench(newBench);
        return;
      }
    }

    if (!canSelectPlayer(player)) return;

    const slot = getNextAvailableSlot(player.position);
    if (!slot) return;

    if (slot.isBench) {
      const newBench = [...bench];
      newBench[slot.index] = player;
      setBench(newBench);
    } else {
      const newStarters = [...starters];
      newStarters[slot.index] = player;
      setStarters(newStarters);
    }
  };

  const handleCaptainSelect = (player: Player) => {
    setCaptain(captain?.id === player.id ? null : player);
  };

  const handleSlotClick = (index: number, isBench: boolean) => {
    if (isBench && bench[index]) {
      const newBench = [...bench];
      newBench[index] = null;
      setBench(newBench);
    } else if (!isBench && starters[index]) {
      if (captain?.id === starters[index]?.id) setCaptain(null);
      const newStarters = [...starters];
      newStarters[index] = null;
      setStarters(newStarters);
    }
  };

  const isTeamComplete = useMemo(() => {
    const hasAllStarters = starters.every((p) => p !== null);
    const hasAllBench = bench.every((p) => p !== null);
    const hasCaptain = captain !== null;
    return hasAllStarters && hasAllBench && hasCaptain;
  }, [starters, bench, captain]);

  const handleSubmitTeam = async () => {
    if (!connected || !account || !isTeamComplete || !currentGameweek) return;

    setIsSubmitting(true);
    try {
      const playerIds = [...starters, ...bench].map((p) => p!.id.toString());
      const playerPositions = [...starters, ...bench].map((p) => p!.positionId.toString());
      const playerClubs = [...starters, ...bench].map((p) => p!.teamId.toString());
      const captainId = captain!.id.toString();

      await signAndSubmitTransaction({
        data: {
          function: moduleFunction("register_team"),
          typeArguments: [],
          functionArguments: [
            currentGameweek.id.toString(),
            playerIds,
            playerPositions,
            playerClubs,
            captainId,
          ],
        },
      });

      setAlreadyRegistered(true);
      alert("Team registered successfully!");
    } catch (error: any) {
      console.error("Failed to register team:", error);
      alert(`Failed to register team: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="glass-card rounded-2xl p-12">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Squad Selection</h1>
          <p className="text-muted-foreground">Please connect your wallet to select your squad.</p>
        </div>
      </div>
    );
  }

  if (alreadyRegistered) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="glass-card rounded-2xl p-12 glow-green">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Already Registered</h1>
          <p className="text-muted-foreground mb-4">
            You have already registered a team for Gameweek {currentGameweek?.id}.
          </p>
          <p className="text-emerald-400 font-medium">Check the leaderboard for results!</p>
        </div>
      </div>
    );
  }

  if (!currentGameweek || currentGameweek.status !== "open") {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="glass-card rounded-2xl p-12">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">No Open Gameweek</h1>
          <p className="text-muted-foreground">
            There is no gameweek currently open for registration.
            {currentGameweek && ` Gameweek ${currentGameweek.id} is ${currentGameweek.status}.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Gameweek {currentGameweek?.id} Squad
          </h1>
          <p className="text-muted-foreground">
            Select 11 starters + 3 subs. Max 3 players per club.
          </p>
        </div>
        <div className="glass-card px-6 py-4 rounded-xl">
          <p className="text-sm text-muted-foreground">Entry Fee</p>
          <p className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
            {config ? formatMOVE(config.entryFee) : "-"} MOVE
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Formation View */}
        <div>
          <FormationGrid
            starters={starters}
            bench={bench}
            captain={captain}
            onPlayerClick={handleSlotClick}
            onCaptainSelect={handleCaptainSelect}
          />

          <div className="mt-6 glass-card rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full",
                starters.filter(Boolean).length === 11
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-secondary text-muted-foreground"
              )}>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  starters.filter(Boolean).length === 11 ? "bg-emerald-400" : "bg-muted-foreground"
                )} />
                {starters.filter(Boolean).length}/11 Starters
              </span>
              <span className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full",
                bench.filter(Boolean).length === 3
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-secondary text-muted-foreground"
              )}>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  bench.filter(Boolean).length === 3 ? "bg-emerald-400" : "bg-muted-foreground"
                )} />
                {bench.filter(Boolean).length}/3 Subs
              </span>
              <span className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full",
                captain
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-secondary text-muted-foreground"
              )}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
                </svg>
                {captain ? "Captain Set" : "Select Captain"}
              </span>
            </div>
          </div>

          <button
            onClick={handleSubmitTeam}
            disabled={!isTeamComplete || isSubmitting}
            className={cn(
              "mt-4 w-full py-4 rounded-xl font-bold text-lg transition-all",
              isTeamComplete && !isSubmitting
                ? "btn-primary"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {isSubmitting
              ? "Submitting..."
              : isTeamComplete
              ? `Confirm Team (${formatMOVE(config?.entryFee || 0)} MOVE)`
              : "Complete Your Squad"}
          </button>
        </div>

        {/* Player List */}
        <div className="glass-card rounded-2xl p-4">
          <div className="mb-4 space-y-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary/50 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary border border-border"
              />
            </div>
            <div className="flex gap-2">
              {(["ALL", "GK", "DEF", "MID", "FWD"] as PositionFilter[]).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPositionFilter(pos)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    positionFilter === pos
                      ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[600px] overflow-y-auto space-y-2 pr-2">
            {filteredPlayers.map((player) => {
              const isSelected = selectedPlayers.has(player.id);
              const canSelect = canSelectPlayer(player);

              return (
                <div
                  key={player.id}
                  className={cn(
                    !isSelected && !canSelect && "opacity-50"
                  )}
                >
                  <PlayerCard
                    player={player}
                    selected={isSelected}
                    onClick={() => handlePlayerSelect(player)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
