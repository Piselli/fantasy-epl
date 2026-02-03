"use client";

import { useState, useRef, useEffect } from "react";
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
      <nav className="relative z-20 border-b border-border/50 backdrop-blur-md bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <span className="font-bold text-xl bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                  Fantasy EPL
                </span>
              </Link>
              <div className="hidden md:flex items-center gap-1">
                <Link href="/gameweek" className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">Squad</Link>
                <Link href="/titles" className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">Titles</Link>
                <Link href="/leaderboard" className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">Leaderboard</Link>
                <Link href="/admin" className="px-4 py-2 rounded-lg text-muted-foreground/60 hover:text-muted-foreground hover:bg-secondary/30 transition-all text-sm">Admin</Link>
              </div>
            </div>
            <div className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-secondary/50 text-muted-foreground">
              Loading...
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="relative z-20 border-b border-border/50 backdrop-blur-md bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-shadow">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                Fantasy EPL
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/gameweek"
                className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
              >
                Squad
              </Link>
              <Link
                href="/titles"
                className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
              >
                Titles
              </Link>
              <Link
                href="/leaderboard"
                className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
              >
                Leaderboard
              </Link>
              <Link
                href="/admin"
                className="px-4 py-2 rounded-lg text-muted-foreground/60 hover:text-muted-foreground hover:bg-secondary/30 transition-all text-sm"
              >
                Admin
              </Link>
            </div>
          </div>

          <div className="relative" ref={dropdownRef}>
            {connected && account ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm text-emerald-400 font-mono">
                    {shortenAddress(account.address.toString())}
                  </span>
                </div>
                <button
                  onClick={disconnect}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowWalletList(!showWalletList)}
                  className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold"
                >
                  Connect Wallet
                </button>

                {showWalletList && (
                  <div className="absolute right-0 mt-2 w-64 glass-card rounded-xl border border-border shadow-xl overflow-hidden">
                    <div className="p-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground">Select Wallet</p>
                      <p className="text-xs text-muted-foreground">Choose your preferred wallet</p>
                    </div>
                    <div className="p-2 max-h-64 overflow-y-auto">
                      {availableWallets.length > 0 ? (
                        availableWallets.map((wallet) => (
                          <button
                            key={wallet.name}
                            onClick={() => handleConnectWallet(wallet.name)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                          >
                            {wallet.icon && (
                              <img
                                src={wallet.icon}
                                alt={wallet.name}
                                className="w-8 h-8 rounded-lg"
                              />
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground">{wallet.name}</p>
                              <p className="text-xs text-emerald-400">Installed</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-center">
                          <p className="text-sm text-muted-foreground">No wallets found</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Install Nightly or another Movement-compatible wallet
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
