"use client";

import { getConfig, getGameweek } from "@/lib/aptos";
import { formatMOVE } from "@/lib/utils";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const { connected } = useWallet();
  const [config, setConfig] = useState<any>(null);
  const [currentGameweek, setCurrentGameweek] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      const configData = await getConfig();
      setConfig(configData);

      if (configData?.currentGameweek) {
        const gwData = await getGameweek(configData.currentGameweek);
        setCurrentGameweek(gwData);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="relative text-center mb-16 py-12">
        <div className="absolute inset-0 hero-gradient rounded-3xl" />
        <div className="relative">
          <h1 className="text-6xl font-bold text-white mb-4">
            Fantasy <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">EPL</span>
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Powered by Movement Network
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Build your dream team, compete weekly, and win prizes.
            The ultimate fantasy football experience on blockchain.
          </p>

          {connected ? (
            <Link
              href="/gameweek"
              className="btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Pick Your Squad
            </Link>
          ) : (
            <p className="text-muted-foreground">Connect your wallet to start playing!</p>
          )}
        </div>
      </div>

      {/* Current Gameweek Info */}
      {currentGameweek && (
        <div className="glass-card rounded-2xl p-6 mb-12 glow-green">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Gameweek {currentGameweek.id}
              </h2>
              <span className={`inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-sm font-medium ${currentGameweek.status === "open"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : currentGameweek.status === "closed"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-muted text-muted-foreground border border-border"
                }`}>
                <span className={`w-2 h-2 rounded-full ${currentGameweek.status === "open" ? "bg-emerald-400 animate-pulse" :
                    currentGameweek.status === "closed" ? "bg-amber-400" : "bg-muted-foreground"
                  }`} />
                {currentGameweek.status.toUpperCase()}
              </span>
            </div>
            <div className="flex gap-8">
              <div className="text-center stat-card px-6 py-4 rounded-xl">
                <p className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                  {formatMOVE(currentGameweek.prizePool)}
                </p>
                <p className="text-sm text-muted-foreground">Prize Pool (MOVE)</p>
              </div>
              <div className="text-center stat-card px-6 py-4 rounded-xl">
                <p className="text-3xl font-bold text-white">
                  {currentGameweek.totalEntries}
                </p>
                <p className="text-sm text-muted-foreground">Entries</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-white text-center mb-2">How It Works</h2>
        <p className="text-muted-foreground text-center mb-8">Four simple steps to start competing</p>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            {
              step: "1",
              title: "Pick Your Squad",
              description: "Select 11 players in 4-3-3 formation plus 3 substitutes",
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ),
            },
            {
              step: "2",
              title: "Pay Entry Fee",
              description: "Confirm your team with a small entry fee to join the gameweek",
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
            {
              step: "3",
              title: "Earn Points",
              description: "Your players earn points based on their real match performance",
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ),
            },
            {
              step: "4",
              title: "Win Prizes",
              description: "Top managers share the prize pool at the end of each gameweek",
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              ),
            },
          ].map((item) => (
            <div key={item.step} className="glass-card rounded-2xl p-6 text-center group hover:glow-green transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-shadow">
                {item.icon}
              </div>
              <div className="text-xs text-emerald-400 font-semibold mb-2">STEP {item.step}</div>
              <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scoring Rules */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-white text-center mb-2">Scoring System</h2>
        <p className="text-muted-foreground text-center mb-8">How your players earn points</p>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-emerald-400">Positive Points</h3>
            </div>
            <ul className="space-y-3 text-foreground">
              {[
                ["Playing 1+ minutes", "+1"],
                ["Playing 60+ minutes", "+1"],
                ["Goal (Forward)", "+4"],
                ["Goal (Midfielder)", "+5"],
                ["Goal (Defender/GK)", "+6"],
                ["Assist", "+3"],
                ["Clean Sheet (GK/DEF)", "+4"],
                ["Penalty Saved", "+5"],
              ].map(([label, points]) => (
                <li key={label} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-emerald-400 font-semibold">{points}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-destructive">Deductions</h3>
            </div>
            <ul className="space-y-3 text-foreground mb-8">
              {[
                ["Yellow Card", "-1"],
                ["Red Card", "-3"],
                ["Own Goal", "-2"],
                ["Penalty Missed", "-2"],
              ].map(([label, points]) => (
                <li key={label} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-destructive font-semibold">{points}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-400">Rating Bonus</h3>
            </div>
            <ul className="space-y-3 text-foreground">
              {[
                ["Rating 9.0+", "+3", "text-emerald-400"],
                ["Rating 8.0-8.9", "+2", "text-emerald-400"],
                ["Rating 7.5-7.9", "+1", "text-emerald-400"],
                ["Rating below 6.0", "-1", "text-destructive"],
              ].map(([label, points, colorClass]) => (
                <li key={label as string} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={`font-semibold ${colorClass}`}>{points}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Titles & Guilds */}
      <div className="text-center glass-card rounded-2xl p-12 glow-gold">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-6">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          Boost Your Score
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Titles & Guilds</h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
          Purchase Titles and Guilds to get bonus multipliers (5%, 10%, or 15%) on your final score!
          Each title type triggers under different match conditions.
        </p>
        <Link
          href="/titles"
          className="btn-secondary inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          View Titles & Guilds
        </Link>
      </div>
    </div>
  );
}
