/**
 * NEXT_PUBLIC_EXCHANGE uses the first 3 letters of the provider alias.
 * Colliding prefixes are disambiguated (binanceus, bitget, bitfinex).
 */
export const PUBLIC_EXCHANGE_CODES: Record<string, string> = {
  kuc: "kucoin",
  bin: "binance",
  biu: "binanceus",
  bus: "binanceus",
  kra: "kraken",
  okx: "okx",
  xt: "xt",
  byb: "bybit",
  mex: "mexc",
  gat: "gate",
  btg: "bitget",
  coi: "coinbase",
  htx: "htx",
  huo: "htx",
  upb: "upbit",
  cry: "cryptocom",
  bfx: "bitfinex",
  lba: "lbank",
};

const ALIASES = new Set(Object.values(PUBLIC_EXCHANGE_CODES));

export function resolvePublicExchange(code?: string | null): string {
  const raw = String(code || "bin")
    .toLowerCase()
    .trim()
    .replace(/^["']+|["']+$/g, "");
  if (PUBLIC_EXCHANGE_CODES[raw]) return PUBLIC_EXCHANGE_CODES[raw];
  if (ALIASES.has(raw)) return raw;
  if (raw.length >= 3 && PUBLIC_EXCHANGE_CODES[raw.slice(0, 3)]) {
    return PUBLIC_EXCHANGE_CODES[raw.slice(0, 3)];
  }
  return "binance";
}
