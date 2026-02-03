import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMOVE(octas: number): string {
  return (octas / 100_000_000).toFixed(2);
}

export function octasToMOVE(octas: number): number {
  return octas / 100_000_000;
}

export function moveToOctas(move: number): number {
  return Math.floor(move * 100_000_000);
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function getMultiplierDisplay(basisPoints: number): string {
  return `${basisPoints / 100}%`;
}
