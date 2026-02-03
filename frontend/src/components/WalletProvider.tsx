"use client";

import { PropsWithChildren } from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export function WalletProvider({ children }: PropsWithChildren) {
  // Don't pass dappConfig - the wallet adapter will check network on transactions
  // The wallet must be configured to Movement testnet before sending transactions
  // Our aptos.ts client handles all RPC calls to Movement network
  return (
    <AptosWalletAdapterProvider
      autoConnect={false}
      optInWallets={[]}
      onError={(error) => {
        console.error("Wallet error:", error);
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AptosWalletAdapterProvider>
  );
}
