"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getCryptoImageUrl } from "@/utils/image-fallback";

/**
 * Chain and currency logos for the NFT addon.
 * =========================================================================
 *
 * WHY THIS EXISTS
 * The rest of the platform renders a coin next to every ticker — p2p's
 * `offer-hero`, binary's `market-selector`, the ecosystem market grid all pull
 * `/img/crypto/{symbol}.webp` out of the 11.5k-icon set in `public/img/crypto`.
 * The NFT addon shipped without any of it: chains rendered as a bare
 * `<Badge>BSC</Badge>`, prices as `1.5 BNB` in plain text, and the landing
 * page's multi-chain grid drew `chain.symbol.slice(0, 2)` — the first two
 * LETTERS of the ticker — in a coloured square where the logo belongs.
 *
 * CHAIN LOGO != CURRENCY LOGO, and conflating them is why this is two
 * components rather than one. Arbitrum, Optimism and Base are all settled in
 * ETH but none of them is Ethereum: a chain badge wants the chain's own brand
 * mark (`arb`, `op`, `base`) while a PRICE on that chain wants the coin that
 * price is denominated in (`eth`). `gas-estimator` had already gone wrong the
 * other way, printing "0.0012 BSC" for a fee that is actually paid in BNB.
 *
 * The table below mirrors `CHAIN_METADATA` in
 * `backend/src/api/(ext)/nft/chains/index.get.ts`. That endpoint only covers
 * chains with a deployed marketplace contract, so it cannot answer for a
 * collection row whose chain has since been disabled — every surface that
 * renders a stored `collection.chain` needs the mapping locally.
 */
const CHAIN_METADATA: Record<
  string,
  { name: string; icon: string; currency: string }
> = {
  ETH: { name: "Ethereum", icon: "eth", currency: "ETH" },
  ETHEREUM: { name: "Ethereum", icon: "eth", currency: "ETH" },
  BSC: { name: "BNB Smart Chain", icon: "bnb", currency: "BNB" },
  BINANCE: { name: "BNB Smart Chain", icon: "bnb", currency: "BNB" },
  POLYGON: { name: "Polygon", icon: "matic", currency: "MATIC" },
  MATIC: { name: "Polygon", icon: "matic", currency: "MATIC" },
  ARBITRUM: { name: "Arbitrum", icon: "arb", currency: "ETH" },
  ARB: { name: "Arbitrum", icon: "arb", currency: "ETH" },
  OPTIMISM: { name: "Optimism", icon: "op", currency: "ETH" },
  OP: { name: "Optimism", icon: "op", currency: "ETH" },
  AVALANCHE: { name: "Avalanche", icon: "avax", currency: "AVAX" },
  AVAX: { name: "Avalanche", icon: "avax", currency: "AVAX" },
  BASE: { name: "Base", icon: "base", currency: "ETH" },
  FANTOM: { name: "Fantom", icon: "ftm", currency: "FTM" },
  FTM: { name: "Fantom", icon: "ftm", currency: "FTM" },
  CRONOS: { name: "Cronos", icon: "cro", currency: "CRO" },
  CRO: { name: "Cronos", icon: "cro", currency: "CRO" },
  SOLANA: { name: "Solana", icon: "sol", currency: "SOL" },
  SOL: { name: "Solana", icon: "sol", currency: "SOL" },
};

/** The coin a chain's gas and native-token prices are denominated in. */
export function chainNativeCurrency(chain?: string | null): string {
  if (!chain) return "ETH";
  return CHAIN_METADATA[chain.toUpperCase()]?.currency ?? chain.toUpperCase();
}

/** Human-readable chain name, falling back to the raw identifier. */
export function chainDisplayName(chain?: string | null): string {
  if (!chain) return "";
  return CHAIN_METADATA[chain.toUpperCase()]?.name ?? chain;
}

/** The `/img/crypto` symbol that carries a chain's own brand mark. */
function chainIconSymbol(chain?: string | null): string {
  if (!chain) return "generic";
  return CHAIN_METADATA[chain.toUpperCase()]?.icon ?? chain;
}

const FALLBACK_ICON = "/img/crypto/generic.webp";

interface CoinImageProps {
  /** `/img/crypto` symbol — a ticker, not a path. */
  symbol: string;
  alt: string;
  size?: number;
  className?: string;
}

/**
 * The icon set has 11.5k entries but the currency on a listing is free text, so
 * a miss is normal rather than exceptional. State drives the fallback instead
 * of reassigning `currentTarget.src`: next/image re-renders on prop changes and
 * would put the 404 URL straight back, re-firing `onError` in a loop.
 */
function CoinImage({ symbol, alt, size = 20, className }: CoinImageProps) {
  const src = getCryptoImageUrl(symbol);
  const [failed, setFailed] = useState(false);

  return (
    <Image
      key={src}
      src={failed ? FALLBACK_ICON : src}
      alt={alt}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full object-contain", className)}
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}

export interface ChainIconProps {
  chain?: string | null;
  size?: number;
  className?: string;
}

/** A chain's own brand mark — Arbitrum's, not Ethereum's. */
export function ChainIcon({ chain, size = 20, className }: ChainIconProps) {
  return (
    <CoinImage
      symbol={chainIconSymbol(chain)}
      alt={chainDisplayName(chain)}
      size={size}
      className={className}
    />
  );
}

export interface CurrencyIconProps {
  currency?: string | null;
  size?: number;
  className?: string;
}

/** The coin a price is denominated in. */
export function CurrencyIcon({
  currency,
  size = 20,
  className,
}: CurrencyIconProps) {
  const code = (currency || "generic").toUpperCase();
  return (
    <CoinImage
      symbol={code}
      alt={currency || ""}
      size={size}
      className={className}
    />
  );
}

export interface ChainBadgeProps
  extends Omit<React.ComponentProps<typeof Badge>, "children"> {
  chain?: string | null;
  iconSize?: number;
}

/**
 * `<Badge>{collection.chain}</Badge>` with the chain's logo in front of it —
 * the shape repeated across create, creator, deploy and the collection editor.
 */
export function ChainBadge({
  chain,
  iconSize = 14,
  className,
  ...props
}: ChainBadgeProps) {
  if (!chain) return null;
  return (
    <Badge className={cn("gap-1.5", className)} {...props}>
      <ChainIcon chain={chain} size={iconSize} />
      {chain}
    </Badge>
  );
}

export interface CurrencyAmountProps {
  /** Ticker the amount is denominated in. */
  currency?: string | null;
  children: React.ReactNode;
  iconSize?: number;
  className?: string;
}

/** A price with its coin in front — `<icon> 1.5 BNB`. */
export function CurrencyAmount({
  currency,
  children,
  iconSize = 16,
  className,
}: CurrencyAmountProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <CurrencyIcon currency={currency} size={iconSize} />
      {children}
    </span>
  );
}
