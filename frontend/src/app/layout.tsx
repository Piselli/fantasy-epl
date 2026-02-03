import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fantasy EPL on Movement",
  description: "Fantasy football game powered by Movement Network",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <div className="min-h-screen main-gradient soccer-pattern">
            <Navbar />
            <main className="relative z-10">{children}</main>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
