"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { TitleCard } from "@/components/TitleCard";
import { TITLE_TYPES, MULTIPLIER_DISPLAY } from "@/lib/constants";
import { moduleFunction, getConfig, getUserTitle, getUserGuild, hasTitle, hasGuild } from "@/lib/aptos";
import { formatMOVE, getMultiplierDisplay, cn } from "@/lib/utils";

export default function TitlesPage() {
  const { connected, account, signAndSubmitTransaction } = useWallet();

  const [config, setConfig] = useState<any>(null);
  const [userTitle, setUserTitle] = useState<any>(null);
  const [userGuild, setUserGuild] = useState<any>(null);
  const [hasTitleFlag, setHasTitleFlag] = useState(false);
  const [hasGuildFlag, setHasGuildFlag] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const configData = await getConfig();
      setConfig(configData);

      if (account?.address) {
        const addr = account.address.toString();
        const [titleExists, guildExists] = await Promise.all([
          hasTitle(addr),
          hasGuild(addr),
        ]);

        setHasTitleFlag(titleExists);
        setHasGuildFlag(guildExists);

        if (titleExists) {
          const titleData = await getUserTitle(addr);
          setUserTitle(titleData);
        }

        if (guildExists) {
          const guildData = await getUserGuild(addr);
          setUserGuild(guildData);
        }
      }
      setIsLoading(false);
    }
    fetchData();
  }, [account?.address]);

  const handleBuyTitle = async () => {
    if (!connected || !account) return;

    setIsSubmitting(true);
    try {
      await signAndSubmitTransaction({
        data: {
          function: moduleFunction("buy_title"),
          typeArguments: [],
          functionArguments: ["1"], // season 1
        },
      });

      // Refresh data
      const titleData = await getUserTitle(account.address.toString());
      setUserTitle(titleData);
      setHasTitleFlag(true);
    } catch (error: any) {
      console.error("Failed to buy title:", error);
      alert(`Failed to buy title: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRerollTitle = async () => {
    if (!connected || !account || !hasTitleFlag) return;

    setIsSubmitting(true);
    try {
      await signAndSubmitTransaction({
        data: {
          function: moduleFunction("reroll_title"),
          typeArguments: [],
          functionArguments: [],
        },
      });

      // Refresh data
      const titleData = await getUserTitle(account.address.toString());
      setUserTitle(titleData);
    } catch (error: any) {
      console.error("Failed to reroll title:", error);
      alert(`Failed to reroll title: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyGuild = async () => {
    if (!connected || !account) return;

    setIsSubmitting(true);
    try {
      await signAndSubmitTransaction({
        data: {
          function: moduleFunction("buy_guild"),
          typeArguments: [],
          functionArguments: ["1"], // season 1
        },
      });

      // Refresh data
      const guildData = await getUserGuild(account.address.toString());
      setUserGuild(guildData);
      setHasGuildFlag(true);
    } catch (error: any) {
      console.error("Failed to buy guild:", error);
      alert(`Failed to buy guild: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRerollGuild = async () => {
    if (!connected || !account || !hasGuildFlag) return;

    setIsSubmitting(true);
    try {
      await signAndSubmitTransaction({
        data: {
          function: moduleFunction("reroll_guild"),
          typeArguments: [],
          functionArguments: [],
        },
      });

      // Refresh data
      const guildData = await getUserGuild(account.address.toString());
      setUserGuild(guildData);
    } catch (error: any) {
      console.error("Failed to reroll guild:", error);
      alert(`Failed to reroll guild: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="glass-card rounded-2xl p-12">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Titles & Guilds</h1>
          <p className="text-muted-foreground">Please connect your wallet to view your titles and guilds.</p>
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-6">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
          Score Multipliers
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Titles & Guilds</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Boost your score with multipliers! Titles and Guilds give you bonus points
          when their conditions are met during the gameweek.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Titles Section */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Your Title</h2>
              <p className="text-muted-foreground text-sm">
                Triggers on specific stat conditions
              </p>
            </div>
          </div>

          {hasTitleFlag && userTitle ? (
            <div className="space-y-4">
              <TitleCard
                titleType={userTitle.titleType}
                multiplier={userTitle.multiplier}
              />
              <button
                onClick={handleRerollTitle}
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-medium hover:from-rose-400 hover:to-pink-500 transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : `Reroll Title (${formatMOVE(config?.titleFee || 0)} MOVE)`}
              </button>
              <p className="text-xs text-muted-foreground text-center">
                Reroll guarantees a different title type
              </p>
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-muted-foreground mb-4">You don't have a title yet.</p>
              <button
                onClick={handleBuyTitle}
                disabled={isSubmitting}
                className="btn-primary px-6 py-3 rounded-xl font-medium disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : `Buy Title (${formatMOVE(config?.titleFee || 0)} MOVE)`}
              </button>
              <p className="text-xs text-muted-foreground mt-3">
                Random title + random multiplier (5%, 10%, or 15%)
              </p>
            </div>
          )}
        </div>

        {/* Guild Section */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Your Guild</h2>
              <p className="text-muted-foreground text-sm">
                Triggers on MVP or 9.0+ rating
              </p>
            </div>
          </div>

          {hasGuildFlag && userGuild ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border-2 border-purple-500/50 bg-purple-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      Guild
                    </span>
                    <h3 className="text-lg font-bold text-white mt-2">Active Guild</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                      {getMultiplierDisplay(userGuild.multiplier)}
                    </span>
                    <p className="text-xs text-muted-foreground">Multiplier</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Triggers when your player gets rated 9.0+ or named MVP
                </p>
              </div>
              <button
                onClick={handleRerollGuild}
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-medium hover:from-rose-400 hover:to-pink-500 transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : `Reroll Guild (${formatMOVE(config?.guildFee || 0)} MOVE)`}
              </button>
              <p className="text-xs text-muted-foreground text-center">
                Reroll for a chance at a higher multiplier
              </p>
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-muted-foreground mb-4">You don't have a guild yet.</p>
              <button
                onClick={handleBuyGuild}
                disabled={isSubmitting}
                className="btn-primary px-6 py-3 rounded-xl font-medium disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : `Buy Guild (${formatMOVE(config?.guildFee || 0)} MOVE)`}
              </button>
              <p className="text-xs text-muted-foreground mt-3">
                Random multiplier (5%, 10%, or 15%)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Title Types Reference */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">All Title Types</h2>
        <p className="text-muted-foreground text-center mb-6">Each title triggers under different match conditions</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(TITLE_TYPES).map(([id, info]) => (
            <div
              key={id}
              className={cn(
                "glass-card p-4 rounded-xl border transition-all hover:scale-[1.02]",
                Number(id) <= 1
                  ? "border-blue-500/30 hover:border-blue-500/50"
                  : "border-orange-500/30 hover:border-orange-500/50"
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded",
                  Number(id) <= 1 ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"
                )}
              >
                {info.category}
              </span>
              <h3 className="text-white font-bold mt-2">{info.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{info.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Multiplier Info */}
      <div className="mt-12 glass-card rounded-2xl p-8 text-center">
        <h3 className="text-xl font-bold text-white mb-6">Multiplier Chances</h3>
        <div className="flex justify-center gap-6 mb-6">
          {Object.entries(MULTIPLIER_DISPLAY).map(([value, display]) => (
            <div key={value} className="stat-card px-6 py-4 rounded-xl">
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">{display}</span>
              <p className="text-muted-foreground text-sm mt-1">~33% chance</p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground text-sm">
          Title and Guild multipliers stack on your final gameweek score
        </p>
      </div>
    </div>
  );
}
