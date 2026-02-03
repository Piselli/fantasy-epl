"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { moduleFunction, getConfig, getGameweek } from "@/lib/aptos";
import { cn } from "@/lib/utils";
import { fetchGameweekStats, checkApiStatus, type GameweekStatsResult } from "@/lib/football-api";

export default function AdminPage() {
  const { connected, account, signAndSubmitTransaction } = useWallet();

  const [config, setConfig] = useState<any>(null);
  const [currentGameweek, setCurrentGameweek] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newGameweekId, setNewGameweekId] = useState("");
  const [statsJson, setStatsJson] = useState("");
  const [resultsGameweekId, setResultsGameweekId] = useState("");

  // API states
  const [apiKey, setApiKey] = useState("");
  const [fetchGameweek, setFetchGameweek] = useState("");
  const [isFetchingApi, setIsFetchingApi] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [apiWarning, setApiWarning] = useState("");
  const [fetchedFixtures, setFetchedFixtures] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    async function fetchData() {
      const configData = await getConfig();
      setConfig(configData);

      if (configData?.currentGameweek) {
        const gwData = await getGameweek(configData.currentGameweek);
        setCurrentGameweek(gwData);
      }
      setIsLoading(false);
    }
    fetchData();

    // Load API key from localStorage
    const savedApiKey = localStorage.getItem("fantasy_epl_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("fantasy_epl_api_key", apiKey);
    }
  }, [apiKey]);

  const handleCheckApiStatus = async () => {
    if (!apiKey) return;
    const status = await checkApiStatus(apiKey);
    if (status.valid) {
      setApiStatus({
        used: status.requestsUsed,
        limit: status.requestsLimit,
        remaining: status.requestsRemaining,
      });
      setApiWarning(status.warning || "");
      setFetchError("");
    } else {
      setFetchError(status.error || "Invalid API key");
      setApiWarning("");
    }
  };

  const handleFetchFromApi = async () => {
    if (!apiKey || !fetchGameweek) return;

    setIsFetchingApi(true);
    setFetchError("");
    setFetchedFixtures([]);

    try {
      const result: GameweekStatsResult = await fetchGameweekStats(apiKey, parseInt(fetchGameweek));

      if (result.errors.length > 0) {
        setFetchError(result.errors.join("; "));
      }

      if (result.players.length > 0) {
        // Format for the contract submission
        const formattedStats = {
          gameweekId: result.gameweekId,
          players: result.players,
        };
        setStatsJson(JSON.stringify(formattedStats, null, 2));
        setFetchedFixtures(result.fixtures);
      }

      // Update API status
      await handleCheckApiStatus();
    } catch (error: any) {
      setFetchError(error.message || "Failed to fetch stats");
    } finally {
      setIsFetchingApi(false);
    }
  };

  const isAdmin = config?.admins?.includes(account?.address?.toString() || "");
  const isOracle = config?.oracle === account?.address?.toString();

  const handleCreateGameweek = async () => {
    if (!connected || !newGameweekId) return;

    setIsSubmitting(true);
    try {
      await signAndSubmitTransaction({
        data: {
          function: moduleFunction("create_gameweek"),
          typeArguments: [],
          functionArguments: [newGameweekId],
        },
      });
      alert(`Gameweek ${newGameweekId} created!`);
      setNewGameweekId("");
      // Refresh
      const gwData = await getGameweek(Number(newGameweekId));
      setCurrentGameweek(gwData);
    } catch (error: any) {
      console.error("Failed to create gameweek:", error);
      alert(`Failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseGameweek = async () => {
    if (!connected || !currentGameweek) return;

    setIsSubmitting(true);
    try {
      await signAndSubmitTransaction({
        data: {
          function: moduleFunction("close_gameweek"),
          typeArguments: [],
          functionArguments: [currentGameweek.id.toString()],
        },
      });
      alert(`Gameweek ${currentGameweek.id} closed!`);
      // Refresh
      const gwData = await getGameweek(currentGameweek.id);
      setCurrentGameweek(gwData);
    } catch (error: any) {
      console.error("Failed to close gameweek:", error);
      alert(`Failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitStats = async () => {
    if (!connected || !statsJson) return;

    setIsSubmitting(true);
    try {
      // Parse JSON input
      const stats = JSON.parse(statsJson);

      // Validate structure
      if (!stats.gameweekId || !Array.isArray(stats.players)) {
        throw new Error("Invalid stats format. Need { gameweekId, players: [...] }");
      }

      // Extract arrays
      const playerIds = stats.players.map((p: any) => p.playerId.toString());
      const positions = stats.players.map((p: any) => p.position.toString());
      const minutesPlayed = stats.players.map((p: any) => p.minutesPlayed.toString());
      const goals = stats.players.map((p: any) => p.goals.toString());
      const assists = stats.players.map((p: any) => p.assists.toString());
      const cleanSheets = stats.players.map((p: any) => p.cleanSheet);
      const saves = stats.players.map((p: any) => p.saves.toString());
      const penaltiesSaved = stats.players.map((p: any) => p.penaltiesSaved.toString());
      const penaltiesMissed = stats.players.map((p: any) => p.penaltiesMissed.toString());
      const ownGoals = stats.players.map((p: any) => p.ownGoals.toString());
      const yellowCards = stats.players.map((p: any) => p.yellowCards.toString());
      const redCards = stats.players.map((p: any) => p.redCards.toString());
      const ratings = stats.players.map((p: any) => p.rating.toString());
      const tackles = stats.players.map((p: any) => p.tackles.toString());
      const interceptions = stats.players.map((p: any) => p.interceptions.toString());
      const successfulDribbles = stats.players.map((p: any) => p.successfulDribbles.toString());
      const freeKickGoals = stats.players.map((p: any) => p.freeKickGoals.toString());

      await signAndSubmitTransaction({
        data: {
          function: moduleFunction("submit_player_stats"),
          typeArguments: [],
          functionArguments: [
            stats.gameweekId.toString(),
            playerIds,
            positions,
            minutesPlayed,
            goals,
            assists,
            cleanSheets,
            saves,
            penaltiesSaved,
            penaltiesMissed,
            ownGoals,
            yellowCards,
            redCards,
            ratings,
            tackles,
            interceptions,
            successfulDribbles,
            freeKickGoals,
          ],
        },
      });
      alert("Stats submitted successfully!");
    } catch (error: any) {
      console.error("Failed to submit stats:", error);
      alert(`Failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCalculateResults = async () => {
    if (!connected || !resultsGameweekId) return;

    setIsSubmitting(true);
    try {
      // For demo, use empty arrays for title/guild triggers
      // In production, oracle would determine these off-chain
      await signAndSubmitTransaction({
        data: {
          function: moduleFunction("calculate_results"),
          typeArguments: [],
          functionArguments: [
            resultsGameweekId,
            [], // title_triggered_owners
            [], // guild_triggered_owners
            ["1", "2", "3"], // prize_ranks
            ["50", "30", "20"], // prize_percentages
          ],
        },
      });
      alert(`Results calculated for GW ${resultsGameweekId}!`);
    } catch (error: any) {
      console.error("Failed to calculate results:", error);
      alert(`Failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="glass-card rounded-2xl p-12">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Admin Panel</h1>
          <p className="text-muted-foreground">Please connect your wallet to access admin functions.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="glass-card rounded-2xl p-12">
          <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin && !isOracle) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="glass-card rounded-2xl p-12">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You are not authorized to access admin functions.
          </p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Admins: {config?.admins?.length || 0} address(es)</p>
            <p>Oracle: {config?.oracle?.slice(0, 10)}...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage gameweeks and submit match results
        </p>
        <div className="mt-3 flex gap-3">
          {isAdmin && (
            <span className="inline-flex items-center gap-2 text-sm bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Admin
            </span>
          )}
          {isOracle && (
            <span className="inline-flex items-center gap-2 text-sm bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Oracle
            </span>
          )}
        </div>
      </div>

      {/* Current Status */}
      <div className="glass-card rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Current Status</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="stat-card px-4 py-3 rounded-xl">
            <p className="text-muted-foreground text-sm mb-1">Current Gameweek</p>
            <p className="text-3xl font-bold text-white">
              {currentGameweek?.id || "None"}
            </p>
          </div>
          <div className="stat-card px-4 py-3 rounded-xl">
            <p className="text-muted-foreground text-sm mb-1">Status</p>
            <div className={cn(
              "inline-flex items-center gap-2 text-2xl font-bold",
              currentGameweek?.status === "open" && "text-emerald-400",
              currentGameweek?.status === "closed" && "text-amber-400",
              currentGameweek?.status === "resolved" && "text-blue-400"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full",
                currentGameweek?.status === "open" && "bg-emerald-400 animate-pulse",
                currentGameweek?.status === "closed" && "bg-amber-400",
                currentGameweek?.status === "resolved" && "bg-blue-400"
              )} />
              {currentGameweek?.status?.toUpperCase() || "N/A"}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Create Gameweek (Admin) */}
        {isAdmin && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Create Gameweek</h2>
            </div>
            <div className="flex gap-4">
              <input
                type="number"
                placeholder="Gameweek ID (e.g., 1)"
                value={newGameweekId}
                onChange={(e) => setNewGameweekId(e.target.value)}
                className="flex-1 px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-border"
              />
              <button
                onClick={handleCreateGameweek}
                disabled={isSubmitting || !newGameweekId}
                className="btn-primary px-6 py-3 rounded-xl font-medium disabled:opacity-50"
              >
                {isSubmitting ? "..." : "Create"}
              </button>
            </div>
          </div>
        )}

        {/* Close Gameweek (Admin) */}
        {isAdmin && currentGameweek?.status === "open" && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Close Registration</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Close GW {currentGameweek.id} to stop new team registrations and prepare for stats submission.
            </p>
            <button
              onClick={handleCloseGameweek}
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50"
            >
              {isSubmitting ? "..." : "Close Gameweek"}
            </button>
          </div>
        )}

        {/* Fetch Stats from API (Oracle) */}
        {isOracle && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Fetch Stats from API</h2>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Fetch real match stats from API-Sports. Get your API key from{" "}
              <a href="https://www.api-football.com/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                api-football.com
              </a>
            </p>

            <div className="space-y-4">
              {/* API Key Input */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">API Key</label>
                <div className="flex gap-3">
                  <input
                    type="password"
                    placeholder="Enter your API-Sports key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-border font-mono text-sm"
                  />
                  <button
                    onClick={handleCheckApiStatus}
                    disabled={!apiKey}
                    className="px-4 py-3 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition-colors disabled:opacity-50 border border-cyan-500/30"
                  >
                    Check
                  </button>
                </div>
                {apiStatus && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      API Requests: {apiStatus.used} / {apiStatus.limit} today ({apiStatus.remaining} remaining)
                    </p>
                    {apiWarning && (
                      <p className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
                        {apiWarning}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Gameweek Input */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Gameweek to Fetch</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="e.g., 23"
                    value={fetchGameweek}
                    onChange={(e) => setFetchGameweek(e.target.value)}
                    className="w-32 px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-border"
                  />
                  <button
                    onClick={handleFetchFromApi}
                    disabled={!apiKey || !fetchGameweek || isFetchingApi}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50"
                  >
                    {isFetchingApi ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Fetching...
                      </span>
                    ) : (
                      "Fetch Stats"
                    )}
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {fetchError && (
                <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl text-sm border border-rose-500/30">
                  {fetchError}
                </div>
              )}

              {/* Fetched Fixtures */}
              {fetchedFixtures.length > 0 && (
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <p className="text-sm text-emerald-400 font-medium mb-2">
                    Fetched {fetchedFixtures.length} fixtures:
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {fetchedFixtures.map((f, i) => (
                      <p key={i}>{f}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Stats (Oracle) */}
        {isOracle && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Submit Player Stats</h2>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              {statsJson ? "Stats fetched from API - review and submit:" : "Paste JSON with player stats for the gameweek. Format:"}
            </p>
            <pre className="text-xs bg-secondary/50 p-4 rounded-xl mb-4 overflow-x-auto text-muted-foreground border border-border">
{`{
  "gameweekId": 1,
  "players": [
    {
      "playerId": 70,
      "position": 3,
      "minutesPlayed": 90,
      "goals": 2,
      "assists": 1,
      "cleanSheet": false,
      "saves": 0,
      "penaltiesSaved": 0,
      "penaltiesMissed": 0,
      "ownGoals": 0,
      "yellowCards": 0,
      "redCards": 0,
      "rating": 95,
      "tackles": 1,
      "interceptions": 0,
      "successfulDribbles": 3,
      "freeKickGoals": 0
    }
  ]
}`}
            </pre>
            <textarea
              placeholder="Paste JSON here..."
              value={statsJson}
              onChange={(e) => setStatsJson(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm border border-border"
            />
            <button
              onClick={handleSubmitStats}
              disabled={isSubmitting || !statsJson}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-400 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Stats"}
            </button>
          </div>
        )}

        {/* Calculate Results (Oracle) */}
        {isOracle && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Calculate Results</h2>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Calculate final scores and distribute prizes. Gameweek must be closed with stats submitted.
            </p>
            <div className="flex gap-4">
              <input
                type="number"
                placeholder="Gameweek ID"
                value={resultsGameweekId}
                onChange={(e) => setResultsGameweekId(e.target.value)}
                className="w-32 px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-border"
              />
              <button
                onClick={handleCalculateResults}
                disabled={isSubmitting || !resultsGameweekId}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl font-medium hover:from-purple-400 hover:to-violet-500 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50"
              >
                {isSubmitting ? "..." : "Calculate & Publish"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
