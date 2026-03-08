"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { shortenAddress } from "@/lib/utils";

export function Navbar() {
  const { connected, account, connect, disconnect, wallets } = useWallet();
  const [showWalletList, setShowWalletList] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowWalletList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConnectWallet = async (walletName: string) => {
    try {
      await connect(walletName as any);
      setShowWalletList(false);
    } catch (e) {
      console.error("Failed to connect:", e);
    }
  };

  // Filter to only show installed wallets
  const availableWallets = wallets?.filter(w => w.readyState === "Installed") || [];

  // Don't render wallet-dependent UI until mounted (prevents hydration issues)
  if (!mounted) {
    return (
      <nav className="relative z-50 border-b border-white/5 backdrop-blur-xl bg-fpl-navy/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fpl-cyan to-blue-600 flex items-center justify-center shadow-lg shadow-fpl-cyan/20">
                  <svg className="w-6 h-6 text-fpl-navy" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <span className="font-display font-black text-2xl uppercase tracking-tighter bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                  FPL<span className="text-fpl-cyan">MOVE</span>
                </span>
              </Link>
            </div>
            <div className="px-5 py-2.5 rounded-xl border border-white/10 text-sm font-semibold bg-white/5 text-muted-foreground">
              Loading...
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="relative z-50 border-b border-white/5 backdrop-blur-xl bg-fpl-navy/60 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fpl-cyan to-blue-600 flex items-center justify-center shadow-lg shadow-fpl-cyan/20 group-hover:shadow-fpl-cyan/40 group-hover:scale-105 transition-all duration-300">
                <svg className="w-6 h-6 text-fpl-navy" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <span className="font-display font-black text-2xl uppercase tracking-tighter bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent group-hover:text-white transition-colors">
                FPL<span className="text-fpl-cyan">MOVE</span>
              </span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-2">
              <Link
                href="/gameweek"
                className="px-4 py-2 rounded-lg text-sm font-display font-bold uppercase tracking-wide text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
              >
                Squad
              </Link>
              <Link
                href="/titles"
                className="px-4 py-2 rounded-lg text-sm font-display font-bold uppercase tracking-wide text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
              >
                Titles
              </Link>
              <Link
                href="/leaderboard"
                className="px-4 py-2 rounded-lg text-sm font-display font-bold uppercase tracking-wide text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
              >
                Leaderboard
              </Link>
              <div className="h-4 w-px bg-white/10 mx-2 hidden lg:block" />
              <Link
                href="/admin"
                className="px-4 py-2 rounded-lg text-xs font-display font-bold uppercase tracking-wide text-muted-foreground/50 hover:text-white hover:bg-white/5 transition-all"
              >
                Admin
              </Link>
            </div>
          </div>

          <div className="relative flex items-center gap-4" ref={dropdownRef}>
            {connected && account ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-fpl-cyan/30 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-fpl-cyan animate-pulse glow-cyan" />
                  <span className="text-sm text-fpl-cyan font-display font-bold uppercase tracking-wider">
                    {shortenAddress(account.address.toString())}
                  </span>
                </div>
                <button
                  onClick={disconnect}
                  className="px-4 py-2 rounded-xl text-sm font-display font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white transition-all duration-300"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowWalletList(!showWalletList)}
                  className="group relative px-6 py-2.5 rounded-xl text-sm font-display font-bold uppercase tracking-wider overflow-hidden bg-fpl-purple text-white hover:text-fpl-navy hover:bg-fpl-cyan transition-all duration-300 glow-purple hover:glow-cyan focus:outline-none focus:ring-2 focus:ring-fpl-cyan focus:ring-offset-2 focus:ring-offset-fpl-navy"
                >
                  <span className="relative z-10">Connect Wallet</span>
                </button>

                {showWalletList && (
                  <div className="absolute right-0 top-full mt-4 w-72 glass-card rounded-2xl border border-fpl-cyan/20 shadow-2xl shadow-black/50 overflow-hidden origin-top-right transform transition-all">
                    <div className="p-4 border-b border-white/10 bg-white/5">
                      <p className="text-sm font-display font-bold uppercase tracking-wider text-white">Select Wallet</p>
                      <p className="text-xs text-muted-foreground mt-1">Movement Network Compatible</p>
                    </div>
                    <div className="p-2 max-h-64 overflow-y-auto">
                      {availableWallets.length > 0 ? (
                        availableWallets.map((wallet) => (
                          <button
                            key={wallet.name}
                            onClick={() => handleConnectWallet(wallet.name)}
                            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-left group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 p-2 group-hover:border-fpl-cyan/50 transition-colors flex shrink-0 items-center justify-center">
                              {wallet.icon && (
                                <img
                                  src={wallet.icon}
                                  alt={wallet.name}
                                  className="w-full h-full object-contain"
                                />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-display font-bold text-white group-hover:text-fpl-cyan transition-colors">{wallet.name}</p>
                              <p className="text-xs text-fpl-green font-medium uppercase tracking-wider mt-0.5">Installed</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-6 text-center">
                          <div className="w-12 h-12 rounded-xl bg-white/5 mx-auto mb-3 flex items-center justify-center text-muted-foreground text-sm">
                            <span className="text-2xl">🔌</span>
                          </div>
                          <p className="text-sm font-bold text-white mb-1">No Wallets Found</p>
                          <p className="text-xs text-muted-foreground/80 leading-relaxed">
                            Install <a href="https://nightly.app" target="_blank" rel="noreferrer" className="text-fpl-cyan hover:underline">Nightly</a> or another Movement wallet to play.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
