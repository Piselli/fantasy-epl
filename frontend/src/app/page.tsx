"use client";

import { getConfig, getGameweek } from "@/lib/aptos";
import { formatMOVE } from "@/lib/utils";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

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
    <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
      
      {/* Decorative Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-fpl-purple/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[600px] h-[600px] bg-fpl-cyan/10 rounded-full blur-[150px] -z-10 pointer-events-none" />

      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative text-center mb-24 mt-12"
      >
        <div className="relative">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass-card border-fpl-purple/30 text-fpl-purple font-semibold tracking-wider text-xs mb-8 uppercase"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fpl-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-fpl-cyan"></span>
            </span>
            Season 1 is Live on Movement
          </motion.div>
          
          <h1 className="text-7xl font-display font-black text-white mb-6 uppercase tracking-tight leading-none">
            Welcome to <br/>
            <span className="bg-gradient-to-r from-fpl-cyan via-fpl-purple to-fpl-cyan bg-clip-text text-transparent bg-[length:200%_auto] animate-pulse">
              Fantasy EPL
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-light">
            Collect, build, and compete. Experience the ultimate Web3 fantasy football 
            ecosystem powered by the <span className="text-white font-medium">Movement Network</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            {connected ? (
              <Link
                href="/gameweek"
                className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-fpl-purple font-display rounded-xl hover:bg-fpl-cyan hover:text-fpl-navy glow-purple hover:glow-cyan focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fpl-cyan"
              >
                <span className="mr-2 uppercase tracking-wider text-sm">Pick Your Squad</span>
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </Link>
            ) : (
                <div className="glass-card px-8 py-4 rounded-xl border-fpl-cyan/30 text-fpl-cyan font-display font-bold uppercase tracking-wider text-sm">
                  Connect Wallet to Play
                </div>
            )}
            <Link href="#rules" className="text-muted-foreground hover:text-white transition-colors font-medium text-sm uppercase tracking-wide">
              Read the Rules
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Current Gameweek Dashboard */}
      {currentGameweek && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="gradient-border-animated mb-24"
        >
          <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
             {/* Diagonal stripe accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-fpl-cyan/20 to-transparent transform rotate-45 translate-x-32 -translate-y-32 blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <div className="inline-block px-3 py-1 bg-white/5 rounded-lg text-fpl-cyan text-xs font-bold uppercase tracking-widest mb-2 border border-white/10">Active Event</div>
                <h2 className="text-4xl font-display font-bold text-white mb-2">
                  Gameweek {currentGameweek.id}
                </h2>
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${currentGameweek.status === "open"
                    ? "bg-fpl-green/10 text-fpl-green border border-fpl-green/30 glow-green"
                    : currentGameweek.status === "closed"
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/30 glow-gold"
                      : "bg-white/5 text-muted-foreground border border-white/10"
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${currentGameweek.status === "open" ? "bg-fpl-green animate-pulse" :
                      currentGameweek.status === "closed" ? "bg-amber-500" : "bg-muted-foreground"
                    }`} />
                  Matchday {currentGameweek.status}
                </div>
              </div>
              
              <div className="flex flex-wrap justify-center gap-6 w-full md:w-auto">
                <div className="glass-card border-white/10 px-8 py-6 rounded-2xl min-w-[200px] text-center hover:border-fpl-cyan/30 transition-colors">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-2">Prize Pool</p>
                  <p className="text-4xl font-display font-black bg-gradient-to-r from-fpl-cyan to-white bg-clip-text text-transparent text-glow-cyan">
                    {formatMOVE(currentGameweek.prizePool)}
                  </p>
                  <p className="text-xs text-fpl-purple font-bold mt-1 uppercase">MOVE</p>
                </div>
                <div className="glass-card border-white/10 px-8 py-6 rounded-2xl min-w-[200px] text-center hover:border-fpl-purple/30 transition-colors">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-2">Total Alpha</p>
                  <p className="text-4xl font-display font-black text-white">
                    {currentGameweek.totalEntries}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase">Managers</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* How It Works (Sorare Card Style) */}
      <div className="mb-32 relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-black text-white uppercase tracking-tight mb-4">The Journey to Glory</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">Master the market, deploy your squad, and dominate the global leaderboards.</p>
        </div>
        
        <div className="grid md:grid-cols-4 gap-6">
          {[
            {
              step: "01",
              title: "Draft Squad",
              description: "Scout and select your optimal 11 players in a 4-3-3 formation.",
              color: "from-fpl-cyan to-blue-500",
              icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
            },
            {
              step: "02",
              title: "Stake Entry",
              description: "Sign the transaction to lock your team and enter the gameweek pool.",
              color: "from-fpl-purple to-pink-500",
              icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
            },
            {
              step: "03",
              title: "Track Action",
              description: "Watch live as your players accumulate points based on real Premier League data.",
              color: "from-fpl-green to-emerald-600",
              icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
            },
            {
              step: "04",
              title: "Claim Rewards",
              description: "Top managers automatically claim a share of the massive MOVE prize pool.",
              color: "from-amber-400 to-orange-500",
              icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
            },
          ].map((item, index) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              key={item.step} 
              className="glass-card rounded-2xl p-8 text-center group hover:border-white/30 transition-all duration-500 relative overflow-hidden flex flex-col h-full"
            >
              {/* Card background effect */}
              <div className={`absolute -inset-1 bg-gradient-to-b ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
              
              <div className="absolute top-4 right-6 text-6xl font-display font-black text-white/5 pointer-events-none transition-transform group-hover:scale-110 duration-500">
                {item.step}
              </div>

              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-black/50 group-hover:-translate-y-2 transition-transform duration-300 z-10`}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>
              
              <h3 className="text-xl font-display font-bold text-white mb-3 z-10">{item.title}</h3>
              <p className="text-muted-foreground text-sm z-10 flex-grow">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Rules & Mechanics */}
      <div id="rules" className="mb-24 pt-12">
        <div className="text-center mb-16">
          <div className="inline-block px-3 py-1 bg-fpl-navy border border-white/10 rounded-full text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Game Mechanics</div>
          <h2 className="text-4xl font-display font-black text-white uppercase tracking-tight">Scoring System</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Positive Points */}
          <div className="glass-card rounded-2xl p-1 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-fpl-green/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="bg-fpl-navy/80 rounded-xl p-8 h-full relative z-10">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
                <div className="w-12 h-12 rounded-xl bg-fpl-green/10 border border-fpl-green/30 flex items-center justify-center glow-green">
                  <svg className="w-6 h-6 text-fpl-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <h3 className="text-2xl font-display font-bold text-white uppercase tracking-wide">Performance Engine</h3>
              </div>
              
              <ul className="space-y-4">
                {[
                  ["Playing 1+ minutes", "+1", "bg-white/5"],
                  ["Playing 60+ minutes", "+1", "bg-white/5"],
                  ["Goal (Forward)", "+4", "bg-fpl-cyan/10 text-fpl-cyan"],
                  ["Goal (Midfielder)", "+5", "bg-fpl-cyan/10 text-fpl-cyan"],
                  ["Goal (Defender/GK)", "+6", "bg-fpl-purple/20 text-fpl-purple"],
                  ["Assist", "+3", "bg-white/5"],
                  ["Clean Sheet (GK/DEF)", "+4", "bg-fpl-green/10 text-fpl-green"],
                  ["Penalty Saved", "+5", "bg-amber-500/10 text-amber-500"],
                ].map(([label, points, highlight]) => (
                  <li key={label} className="flex justify-between items-center group/item hover:bg-white/5 p-2 rounded-lg transition-colors">
                    <span className="text-muted-foreground font-medium">{label}</span>
                    <span className={`px-3 py-1 rounded-md font-bold ${highlight} font-display text-lg`}>{points}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Deductions & Bonuses */}
          <div className="grid gap-8">
            <div className="glass-card rounded-2xl p-1 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-destructive/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="bg-fpl-navy/80 rounded-xl p-6 h-full relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-display font-bold text-white uppercase tracking-wide">Deductions</h3>
                </div>
                <ul className="space-y-2">
                  {[
                    ["Yellow Card", "-1"],
                    ["Red Card", "-3"],
                    ["Own Goal", "-2"],
                    ["Penalty Missed", "-2"],
                  ].map(([label, points]) => (
                    <li key={label} className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                      <span className="text-muted-foreground font-medium">{label}</span>
                      <span className="text-destructive font-bold font-display">{points}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-1 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-fpl-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="bg-fpl-navy/80 rounded-xl p-6 h-full relative z-10">
                 <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-fpl-cyan/10 border border-fpl-cyan/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-fpl-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-display font-bold text-white uppercase tracking-wide">Match Rating Bonus</h3>
                </div>
                <ul className="space-y-2">
                  {[
                    ["Rating 9.0+", "+3", "text-fpl-cyan"],
                    ["Rating 8.0-8.9", "+2", "text-fpl-cyan"],
                    ["Rating 7.5-7.9", "+1", "text-muted-foreground"],
                    ["Rating below 6.0", "-1", "text-destructive"],
                  ].map(([label, points, colorClass]) => (
                    <li key={label as string} className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                      <span className="text-muted-foreground font-medium">{label}</span>
                      <span className={`font-bold font-display ${colorClass}`}>{points}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Titles & Guilds Call to Action */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="text-center glass-card rounded-[2rem] p-16 relative overflow-hidden border-fpl-purple/30"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsla(260,100%,65%,0.15)_0%,transparent_100%)] pointer-events-none" />
        
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-fpl-navy border border-fpl-purple/30 mx-auto flex items-center justify-center mb-8 glow-purple">
            <svg className="w-8 h-8 text-fpl-purple" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <h2 className="text-4xl font-display font-black text-white mb-6 uppercase tracking-tight">Unlock Elite Status</h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Acquire unique NFT Titles and form Guilds to unlock massive scoring multipliers (5%, 10%, or 15%). 
            Strategize your title selection to maximize returns based on match conditions.
          </p>
          <Link
            href="/titles"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-white/5 border border-white/10 hover:bg-fpl-purple/20 hover:border-fpl-purple/50 transition-all duration-300 font-display uppercase tracking-wider text-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Explore Marketplace
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
