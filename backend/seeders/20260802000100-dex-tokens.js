"use strict";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require("uuid");

/**
 * The majors, so a fresh Swap install is usable.
 *
 * Without this a new operator has to paste six addresses per chain — thirty-six
 * of them — before a single quote can be made, and every one of those pastes is
 * a chance to allowlist a lookalike contract. Seeding them from constants that
 * were reviewed once is strictly safer than seeding nothing.
 *
 * THESE ARE THE ONLY UNPROBED DECIMALS IN THE CODEBASE
 * ----------------------------------------------------
 * Every other write path verifies `decimals()` on-chain before a row may be
 * ALLOWLISTED (`admin/dex/token/utils.ts`). A seeder runs before there is an
 * RPC to ask, so these values are trusted from this file. That is the whole
 * reason `dex-majors.test.ts` exists and why it asserts the shape of every row
 * here rather than sampling — and why the two non-obvious decimals below are
 * called out in comments rather than left to look like typos:
 *
 *   - BSC's USDC and USDT are **18** decimals, not 6. BSC-pegged stablecoins
 *     were bridged as standard BEP-20s. A 6 here would ask a user to approve a
 *     spend a trillion times larger than the number on their screen.
 *   - Polygon's and Optimism's USDC are the NATIVE Circle issuances, not the
 *     bridged USDC.e. Different contracts, both live, both liquid; the native
 *     one is what aggregators route by default.
 *
 * WRAPPED BTC IS NOT `WBTC` ON EVERY CHAIN
 * -----------------------------------------
 * BSC has no canonical WBTC — the liquid wrapped bitcoin there is Binance's
 * BTCB, and it is 18 decimals. Base has no canonical WBTC either; the liquid
 * one is Coinbase's cbBTC. Seeding a symbol called "WBTC" that points at
 * whatever happens to carry the name on those chains is how a user swaps into
 * a token nobody vetted, so each chain gets its own real asset under its own
 * real symbol.
 *
 * IDEMPOTENCE, AND WHAT A RE-RUN IS ALLOWED TO TOUCH
 * --------------------------------------------------
 * `INSERT … ON DUPLICATE KEY UPDATE` on the `(chainId, address)` unique index,
 * updating `symbol`, `name`, `decimals`, `logoUrl` and `sortOrder` only.
 * `listing` and `status` are deliberately NOT in the update list: a re-run that
 * re-enabled a token an operator had switched off would be a curation bypass
 * with no audit row behind it, and seeders run on every deploy.
 *
 * `decimals` IS updated, unlike listing and status, because it is a protocol
 * fact rather than an operator decision — if this file's value was ever wrong,
 * the corrected deploy has to be able to fix rows already in the wild.
 *
 * The address column is lowercase here because the Sequelize model lowercases
 * it in a `set()` and this seeder writes raw SQL, which does not run setters. A
 * mixed-case address stored here would be a SECOND row for a token that
 * already exists — one of which could be DENYLISTED while the other is not.
 */

/** Every aggregator's sentinel for "the chain's own coin". EVM ONLY — see below. */
const NATIVE_SENTINEL = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * NORMALISATION IS PER-VM, AND GETTING IT WRONG HERE IS UNRECOVERABLE.
 *
 * This seeder writes raw SQL, so the model's setter never runs and it lowercases
 * addresses itself. That is correct for EVM and CATASTROPHIC for Solana: base58
 * is case-significant, so `.toLowerCase()` on a mint does not normalise it, it
 * names a different account.
 *
 * How bad depends on the address, which is the part that makes it dangerous.
 * `So11111111111111111111111111111111111111112` — wrapped SOL — lowercases to a
 * string that decodes to a perfectly valid 32-byte pubkey. Not ours. Nothing
 * structural distinguishes it: it would seed clean, allowlist clean, and quote
 * against a mint that does not exist. (Measured; see
 * `e2e/unit/backend/dex/vm-address.test.ts`, case 3 of 3.)
 *
 * Dispatching on the VALUE rather than on the chain id is deliberate: the two
 * encodings are disjoint — base58 excludes `0`, so no `0x…` string is valid
 * base58 — which means this cannot be defeated by a mis-keyed chain.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function normalizeTokenAddress(address) {
  const value = String(address).trim();
  return /^0x[0-9a-fA-F]{40}$/.test(value) ? value.toLowerCase() : value;
}

/**
 * The VM for a row, from the SAME value the address is normalised from.
 *
 * WHY THIS COLUMN HAS TO BE WRITTEN HERE. `dexToken.vm` is what the model's
 * address validator dispatches on, and it DEFAULTS to EVM. This seeder writes
 * raw SQL, so a row that does not name its VM lands as EVM — and then every
 * later instance `.save()` on a Solana, TRON or TON token (a screening
 * downgrade, an operator edit, a decimals correction) validates a base58 address
 * against the EVM regex and REFUSES. The row seeds fine and becomes read-only.
 *
 * Value-dispatched for the same reason `normalizeTokenAddress` is: the encodings
 * are disjoint, so a mis-keyed chain cannot produce a mismatch between the
 * address and the VM that is supposed to describe it.
 */
function vmForTokenAddress(address) {
  const value = String(address).trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(value)) return "EVM";
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value)) return "TVM";
  if (/^[A-Za-z0-9_+/=-]{48}$/.test(value)) return "TON";
  return "SVM";
}

/**
 * Keyed by EVM chain id, mirroring DEX_CHAIN_STATIC's entries exactly — a chain
 * here that the registry does not have would seed tokens the wallet cannot
 * connect to, and `dex-majors-seeder.test.ts` asserts the two agree.
 * `sortOrder` ascends in picker order: native, wrapped native, then the
 * stablecoins, then wrapped BTC.
 *
 * EVERY ROW LANDS `listing: PENDING`, `status: false` — the bulkInsert leaves
 * both out of `updateOnDuplicate` on purpose. So an address that is wrong is an
 * address an operator must still allowlist, and `dexRequireOnChainDecimals`
 * probes `decimals()` against the chain at that moment. That probe is the real
 * check on the constants below; the list is a starting point, not an assertion.
 */
const DEX_MAJORS = {
  // Ethereum
  1: [
    { symbol: "ETH", name: "Ether", address: NATIVE_SENTINEL, decimals: 18, isNative: true, coingeckoId: "ethereum", logoUrl: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png" },
    { symbol: "WETH", name: "Wrapped Ether", address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", decimals: 18, coingeckoId: "weth", logoUrl: "https://coin-images.coingecko.com/coins/images/2518/large/weth.png" },
    { symbol: "USDC", name: "USD Coin", address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6, coingeckoId: "usd-coin", logoUrl: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png" },
    { symbol: "USDT", name: "Tether USD", address: "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6, coingeckoId: "tether", logoUrl: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png" },
    { symbol: "DAI", name: "Dai Stablecoin", address: "0x6b175474e89094c44da98b954eedeac495271d0f", decimals: 18, coingeckoId: "dai", logoUrl: "https://coin-images.coingecko.com/coins/images/9956/large/Badge_Dai.png" },
    { symbol: "WBTC", name: "Wrapped BTC", address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", decimals: 8, coingeckoId: "wrapped-bitcoin", logoUrl: "https://coin-images.coingecko.com/coins/images/7598/large/WBTCLOGO.png" },
  ],
  // Optimism
  10: [
    { symbol: "ETH", name: "Ether", address: NATIVE_SENTINEL, decimals: 18, isNative: true, coingeckoId: "ethereum", logoUrl: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png" },
    { symbol: "WETH", name: "Wrapped Ether", address: "0x4200000000000000000000000000000000000006", decimals: 18, coingeckoId: "l2-standard-bridged-weth-optimism", logoUrl: "https://coin-images.coingecko.com/coins/images/39715/large/WETH.PNG" },
    // Native Circle USDC, not the bridged USDC.e.
    { symbol: "USDC", name: "USD Coin", address: "0x0b2c639c533813f4aa9d7837caf62653d097ff85", decimals: 6, coingeckoId: "usd-coin", logoUrl: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png" },
    { symbol: "USDT", name: "Tether USD", address: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58", decimals: 6, coingeckoId: "bridged-usdt", logoUrl: "https://coin-images.coingecko.com/coins/images/35001/large/logo.png" },
    { symbol: "DAI", name: "Dai Stablecoin", address: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1", decimals: 18, coingeckoId: "makerdao-optimism-bridged-dai-optimism", logoUrl: "https://coin-images.coingecko.com/coins/images/39818/large/dai.png" },
    { symbol: "WBTC", name: "Wrapped BTC", address: "0x68f180fcce6836688e9084f035309e29bf0a2095", decimals: 8, coingeckoId: "wrapped-bitcoin", logoUrl: "https://coin-images.coingecko.com/coins/images/7598/large/WBTCLOGO.png" },
  ],
  // BNB Smart Chain — see the header note on 18-decimal stablecoins and BTCB.
  56: [
    { symbol: "BNB", name: "BNB", address: NATIVE_SENTINEL, decimals: 18, isNative: true, coingeckoId: "binancecoin", logoUrl: "https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png" },
    { symbol: "WBNB", name: "Wrapped BNB", address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", decimals: 18, coingeckoId: "wbnb", logoUrl: "https://coin-images.coingecko.com/coins/images/12591/large/binance-coin-logo.png" },
    { symbol: "USDC", name: "Binance-Peg USD Coin", address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", decimals: 18, coingeckoId: "binance-bridged-usdc-bnb-smart-chain", logoUrl: "https://coin-images.coingecko.com/coins/images/35220/large/USDC.jpg" },
    { symbol: "USDT", name: "Binance-Peg BSC-USD", address: "0x55d398326f99059ff775485246999027b3197955", decimals: 18, coingeckoId: "binance-bridged-usdt-bnb-smart-chain", logoUrl: "https://coin-images.coingecko.com/coins/images/35021/large/USDT.png" },
    { symbol: "DAI", name: "Binance-Peg Dai Token", address: "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3", decimals: 18, coingeckoId: "binance-peg-dai", logoUrl: "https://coin-images.coingecko.com/coins/images/39784/large/dai.png" },
    { symbol: "BTCB", name: "Binance-Peg BTCB Token", address: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", decimals: 18, coingeckoId: "binance-bitcoin", logoUrl: "https://coin-images.coingecko.com/coins/images/14108/large/Binance-bitcoin.png" },
  ],
  // Polygon — the native asset is POL on-chain since the 2024 rename.
  137: [
    { symbol: "POL", name: "Polygon Ecosystem Token", address: NATIVE_SENTINEL, decimals: 18, isNative: true, coingeckoId: "polygon-ecosystem-token", logoUrl: "https://coin-images.coingecko.com/coins/images/32440/large/pol.png" },
    { symbol: "WPOL", name: "Wrapped POL", address: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", decimals: 18, coingeckoId: "wmatic", logoUrl: "https://coin-images.coingecko.com/coins/images/14073/large/matic.png" },
    // Native Circle USDC, not the bridged USDC.e.
    { symbol: "USDC", name: "USD Coin", address: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", decimals: 6, coingeckoId: "usd-coin", logoUrl: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png" },
    // Canonical Polygon Tether. Its on-chain symbol() now reads "USDT0" after
    // Tether's omnichain migration — same contract, same 6 decimals. The
    // display label stays USDT because that is what a user is looking for;
    // the probe reports the difference rather than treating it as a mismatch,
    // since only decimals() is load-bearing.
    { symbol: "USDT", name: "Tether USD", address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", decimals: 6, coingeckoId: "usdt0", logoUrl: "https://coin-images.coingecko.com/coins/images/53705/large/usdt0.jpg" },
    { symbol: "DAI", name: "Dai Stablecoin", address: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063", decimals: 18, coingeckoId: "polygon-pos-bridged-dai-polygon-pos", logoUrl: "https://coin-images.coingecko.com/coins/images/39787/large/dai.png" },
    { symbol: "WBTC", name: "Wrapped BTC", address: "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6", decimals: 8, coingeckoId: "polygon-bridged-wbtc-polygon-pos", logoUrl: "https://coin-images.coingecko.com/coins/images/39530/large/WBTCLOGO.png" },
  ],
  // Base — cbBTC rather than a WBTC that does not canonically exist here.
  8453: [
    { symbol: "ETH", name: "Ether", address: NATIVE_SENTINEL, decimals: 18, isNative: true, coingeckoId: "ethereum", logoUrl: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png" },
    { symbol: "WETH", name: "Wrapped Ether", address: "0x4200000000000000000000000000000000000006", decimals: 18, coingeckoId: "l2-standard-bridged-weth-base", logoUrl: "https://coin-images.coingecko.com/coins/images/39810/large/weth.png" },
    { symbol: "USDC", name: "USD Coin", address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", decimals: 6, coingeckoId: "usd-coin", logoUrl: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png" },
    { symbol: "USDT", name: "Tether USD", address: "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2", decimals: 6, coingeckoId: "l2-standard-bridged-usdt-base", logoUrl: "https://coin-images.coingecko.com/coins/images/39963/large/usdt.png" },
    { symbol: "DAI", name: "Dai Stablecoin", address: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb", decimals: 18, coingeckoId: "l2-standard-bridged-dai-base", logoUrl: "https://coin-images.coingecko.com/coins/images/39807/large/dai.png" },
    { symbol: "cbBTC", name: "Coinbase Wrapped BTC", address: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf", decimals: 8, coingeckoId: "coinbase-wrapped-btc", logoUrl: "https://coin-images.coingecko.com/coins/images/40143/large/cbbtc.webp" },
  ],
  // Arbitrum One
  42161: [
    { symbol: "ETH", name: "Ether", address: NATIVE_SENTINEL, decimals: 18, isNative: true, coingeckoId: "ethereum", logoUrl: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png" },
    { symbol: "WETH", name: "Wrapped Ether", address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1", decimals: 18, coingeckoId: "arbitrum-bridged-weth-arbitrum-one", logoUrl: "https://coin-images.coingecko.com/coins/images/39713/large/WETH.PNG" },
    // Native Circle USDC, not the bridged USDC.e.
    { symbol: "USDC", name: "USD Coin", address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", decimals: 6, coingeckoId: "usd-coin", logoUrl: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png" },
    // As on Polygon: symbol() reads "USD₮0" post-migration, decimals still 6.
    { symbol: "USDT", name: "Tether USD", address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", decimals: 6, coingeckoId: "usdt0", logoUrl: "https://coin-images.coingecko.com/coins/images/53705/large/usdt0.jpg" },
    { symbol: "DAI", name: "Dai Stablecoin", address: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1", decimals: 18, coingeckoId: "makerdao-arbitrum-bridged-dai-arbitrum-one", logoUrl: "https://coin-images.coingecko.com/coins/images/39790/large/dai.png" },
    { symbol: "WBTC", name: "Wrapped BTC", address: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f", decimals: 8, coingeckoId: "arbitrum-bridged-wbtc-arbitrum-one", logoUrl: "https://coin-images.coingecko.com/coins/images/39532/large/WBTCLOGO.png" },
  ],
  // Avalanche C-Chain — the NATIVE Circle/Tether issues, not the `.e` bridged
  // ones, which still exist and still trade. DAI and BTC have no native issue
  // here, so `.e` is the canonical asset for those two and the display label
  // says so rather than pretending otherwise.
  43114: [
    { symbol: "AVAX", name: "Avalanche", address: NATIVE_SENTINEL, decimals: 18, isNative: true, coingeckoId: "avalanche-2", logoUrl: "https://coin-images.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png" },
    { symbol: "WAVAX", name: "Wrapped AVAX", address: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7", decimals: 18, coingeckoId: "wrapped-avax", logoUrl: "https://coin-images.coingecko.com/coins/images/15075/large/wrapped-avax.png" },
    { symbol: "USDC", name: "USD Coin", address: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e", decimals: 6, coingeckoId: "usd-coin", logoUrl: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png" },
    { symbol: "USDT", name: "Tether USD", address: "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7", decimals: 6, coingeckoId: "tether", logoUrl: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png" },
    { symbol: "DAI.e", name: "Dai Stablecoin (Bridged)", address: "0xd586e7f844cea2f87f50152665bcbc2c279d8d70", decimals: 18, coingeckoId: "avalanche-bridged-dai-avalanche", logoUrl: "https://coin-images.coingecko.com/coins/images/39786/large/dai.png" },
    { symbol: "BTC.b", name: "Bitcoin (Avalanche Bridge)", address: "0x152b9d0fdc40c096757f570a51e494bd4b943e50", decimals: 8, coingeckoId: "bitcoin-avalanche-bridged-btc-b", logoUrl: "https://coin-images.coingecko.com/coins/images/26115/large/BTC.b.png" },
  ],
  // Linea
  59144: [
    { symbol: "ETH", name: "Ether", address: NATIVE_SENTINEL, decimals: 18, isNative: true, coingeckoId: "ethereum", logoUrl: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png" },
    { symbol: "WETH", name: "Wrapped Ether", address: "0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f", decimals: 18, coingeckoId: "wrapped-ether-linea", logoUrl: "https://coin-images.coingecko.com/coins/images/31019/large/download_%2817%29.png" },
    { symbol: "USDC", name: "USD Coin", address: "0x176211869ca2b568f2a7d4ee941e073a821ee1ff", decimals: 6, coingeckoId: "bridged-usd-coin-linea", logoUrl: "https://coin-images.coingecko.com/coins/images/31270/large/USDC-icon.png" },
    { symbol: "USDT", name: "Tether USD", address: "0xa219439258ca9da29e9cc4ce5596924745e12b93", decimals: 6, coingeckoId: "bridged-tether-linea", logoUrl: "https://coin-images.coingecko.com/coins/images/31271/large/usdt.jpeg" },
    { symbol: "DAI", name: "Dai Stablecoin", address: "0x4af15ec2a0bd43db75dd04e62faa3b8ef36b00d5", decimals: 18, coingeckoId: "bridged-dai-stablecoin-linea", logoUrl: "https://coin-images.coingecko.com/coins/images/31272/large/dai-stablecoin.png" },
    { symbol: "WBTC", name: "Wrapped BTC", address: "0x3aab2285ddcddad8edf438c1bab47e1a9d05a9b4", decimals: 8, coingeckoId: "linea-bridged-wbtc-linea", logoUrl: "https://coin-images.coingecko.com/coins/images/50164/large/wbtc.png" },
  ],
  /**
   * ───────────────────────────────────────────────────────────────────────────
   * THE ECOSYSTEM'S OTHER EVM CHAINS — every symbol and decimal below was READ
   * FROM THE CHAIN, and four of them contradict what the documentation says.
   *
   * This file's header calls these "the only unprobed decimals in the codebase",
   * because a seeder runs before there is an RPC to ask. That is true at RUN
   * time and was never true at AUTHOR time, so each token was probed —
   * `symbol()`, `decimals()`, `name()` — and the chain's own answer shipped.
   *
   * WHAT THE PROBE CAUGHT, each of which would have been wrong from docs:
   *
   *   1. FANTOM'S WRAPPED BTC AND ETH ARE CALLED `BTC` AND `ETH`. The
   *      Multichain-bridged assets carry the UNWRAPPED ticker on-chain. Seeding
   *      them as WBTC/WETH would put a symbol on the picker that the chain, the
   *      explorer and the user's wallet all disagree with.
   *
   *   2. CELO'S `cUSD` AND `cEUR` NO LONGER EXIST UNDER THOSE SYMBOLS. The same
   *      contracts now report `USDm` / `EURm` ("Mento Dollar" / "Mento Euro").
   *      The addresses are unchanged and still the liquid Celo stablecoins; only
   *      the tickers were renamed, and every guide still says cUSD.
   *
   *   3. CELO'S USDT REPORTS `USD₮` — with Tether's unicode character, not the
   *      ASCII `USDT`. A hardcoded "USDT" would not match a symbol comparison
   *      anywhere.
   *
   *   4. ROOTSTOCK'S rUSDT IS 18 DECIMALS, not the 6 that USDT is on almost
   *      every other chain. Same class of trap as BSC's stablecoins, opposite
   *      direction from the intuition.
   *
   * ROOTSTOCK'S SET IS NOT STABLECOIN-SHAPED, and that is the chain rather than
   * an omission: there is no USDC, no DAI and no WBTC, because RBTC IS bitcoin —
   * a wrapped bitcoin would be a wrapper around the gas token. Its majors are
   * what actually trades there: the wrapped native, the bridged tether, and the
   * Sovryn/RIF assets.
   * ───────────────────────────────────────────────────────────────────────────
   */
  25: [
    { symbol: "CRO", name: "Cronos", address: NATIVE_SENTINEL, decimals: 18, isNative: true, coingeckoId: "crypto-com-chain", logoUrl: "https://coin-images.coingecko.com/coins/images/7310/large/cro_token_logo.png" },
    { symbol: "WCRO", name: "Wrapped CRO", address: "0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23", decimals: 18, coingeckoId: "wrapped-cro", logoUrl: "https://coin-images.coingecko.com/coins/images/7310/large/cro_token_logo.png" },
    { symbol: "USDC", name: "USD Coin", address: "0xc21223249ca28397b4b6541dffaecc539bff0c59", decimals: 6, coingeckoId: "usd-coin", logoUrl: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png" },
    { symbol: "USDT", name: "Tether USD", address: "0x66e428c3f67a68878562e79a0234c1f83c208770", decimals: 6, coingeckoId: "tether", logoUrl: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png" },
    { symbol: "DAI", name: "Dai Stablecoin", address: "0xf2001b145b43032aaf5ee2884e456ccd805f677d", decimals: 18, coingeckoId: "dai", logoUrl: "https://coin-images.coingecko.com/coins/images/9956/large/Badge_Dai.png" },
    { symbol: "WBTC", name: "Wrapped BTC", address: "0x062e66477faf219f25d27dced647bf57c3107d52", decimals: 8, coingeckoId: "wrapped-bitcoin", logoUrl: "https://coin-images.coingecko.com/coins/images/7598/large/WBTCLOGO.png" },
  ],
  30: [
    { symbol: "RBTC", name: "Rootstock Smart Bitcoin", address: NATIVE_SENTINEL, decimals: 18, isNative: true, coingeckoId: "rootstock", logoUrl: "https://coin-images.coingecko.com/coins/images/5070/large/RBTC-logo.png" },
    { symbol: "WRBTC", name: "Wrapped RBTC", address: "0x542fda317318ebf1d3deaf76e0b632741a7e677d", decimals: 18, coingeckoId: "rootstock", logoUrl: "https://coin-images.coingecko.com/coins/images/5070/large/RBTC-logo.png" },
    // EIGHTEEN decimals, not six. Probed, not assumed.
    { symbol: "rUSDT", name: "Rootstock USDT", address: "0xef213441a85df4d7acbdae0cf78004e1e486bb96", decimals: 18, coingeckoId: "tether", logoUrl: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png" },
    { symbol: "USDRIF", name: "RIF US Dollar", address: "0x3a15461d8ae0f0fb5fa2629e9da7d66a794a6e37", decimals: 18, coingeckoId: null, logoUrl: null },
    { symbol: "DOC", name: "Dollar on Chain", address: "0xe700691da7b9851f2f35f8b8182c69c53ccad9db", decimals: 18, coingeckoId: "dollar-on-chain", logoUrl: null },
    { symbol: "SOV", name: "Sovryn", address: "0xefc78fc7d48b64958315949279ba181c2114abbd", decimals: 18, coingeckoId: "sovryn", logoUrl: "https://coin-images.coingecko.com/coins/images/14133/large/sovryn.jpg" },
  ],
  250: [
    { symbol: "FTM", name: "Fantom", address: NATIVE_SENTINEL, decimals: 18, isNative: true, coingeckoId: "fantom", logoUrl: "https://coin-images.coingecko.com/coins/images/4001/large/Fantom_round.png" },
    { symbol: "WFTM", name: "Wrapped Fantom", address: "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83", decimals: 18, coingeckoId: "wrapped-fantom", logoUrl: "https://coin-images.coingecko.com/coins/images/4001/large/Fantom_round.png" },
    { symbol: "USDC", name: "USD Coin", address: "0x04068da6c83afcfa0e13ba15a6696662335d5b75", decimals: 6, coingeckoId: "usd-coin", logoUrl: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png" },
    { symbol: "fUSDT", name: "Frapped USDT", address: "0x049d68029688eabf473097a2fc38ef61633a3c7a", decimals: 6, coingeckoId: "tether", logoUrl: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png" },
    // `BTC` and `ETH`, not WBTC/WETH. The chain's own symbols — see the note above.
    { symbol: "BTC", name: "Bitcoin (Multichain)", address: "0x321162cd933e2be498cd2267a90534a804051b11", decimals: 8, coingeckoId: "wrapped-bitcoin", logoUrl: "https://coin-images.coingecko.com/coins/images/7598/large/WBTCLOGO.png" },
    { symbol: "ETH", name: "Ethereum (Multichain)", address: "0x74b23882a30290451a17c44f4f05243b6b58c76d", decimals: 18, coingeckoId: "weth", logoUrl: "https://coin-images.coingecko.com/coins/images/2518/large/weth.png" },
  ],
  42220: [
    { symbol: "CELO", name: "Celo", address: NATIVE_SENTINEL, decimals: 18, isNative: true, coingeckoId: "celo", logoUrl: "https://coin-images.coingecko.com/coins/images/11090/large/InjXBNx9_400x400.jpg" },
    /*
      THE SAME CONTRACT AS THE NATIVE ROW'S ASSET, listed separately because
      Celo's native token IS an ERC-20. The sentinel row above is the gas-token
      view; this is the transferable-token view, and they are one asset.
    */
    { symbol: "CELO", name: "Celo (ERC-20)", address: "0x471ece3750da237f93b8e339c536989b8978a438", decimals: 18, coingeckoId: "celo", logoUrl: "https://coin-images.coingecko.com/coins/images/11090/large/InjXBNx9_400x400.jpg" },
    { symbol: "USDC", name: "USD Coin", address: "0xceba9300f2b948710d2653dd7b07f33a8b32118c", decimals: 6, coingeckoId: "usd-coin", logoUrl: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png" },
    // The chain reports `USD₮` with Tether's unicode glyph, not ASCII "USDT".
    { symbol: "USD₮", name: "Tether USD", address: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e", decimals: 6, coingeckoId: "tether", logoUrl: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png" },
    // Formerly cUSD/cEUR. Same contracts, renamed to Mento Dollar/Euro.
    { symbol: "USDm", name: "Mento Dollar", address: "0x765de816845861e75a25fca122bb6898b8b1282a", decimals: 18, coingeckoId: "celo-dollar", logoUrl: "https://coin-images.coingecko.com/coins/images/13161/large/icon-celo-dollar-color-1000-circle-cropped.png" },
    { symbol: "WETH", name: "Wrapped Ether", address: "0xd221812de1bd094f35587ee8e174b07b6167d9af", decimals: 18, coingeckoId: "weth", logoUrl: "https://coin-images.coingecko.com/coins/images/2518/large/weth.png" },
  ],
  /**
   * ───────────────────────────────────────────────────────────────────────────
   * TON — and the symbols here are the trap, not the decimals.
   *
   * TWO TOKENS ON THIS CHAIN ANSWER TO "USDT", AND THEY ARE DIFFERENT ASSETS
   * WITH DIFFERENT DECIMALS. Measured from STON.fi's live asset list:
   *
   *   USD₮   6 decimals  EQCxE6mU…  the real Tether issuance, and the liquid one
   *   USDT   9 decimals  EQCQfEu9…  a different token that merely holds the name
   *
   * The first is spelled with Tether's UNICODE glyph. Seeding "USDT" by its
   * ASCII name would pick the wrong asset AND the wrong decimals — a
   * thousand-fold error on every amount, on a token a user would swap into
   * believing it was Tether.
   *
   * NATIVE TON IS THE ZERO ADDRESS and there is no wrapped row, unlike every
   * other chain here. The routers use a proxy jetton (pTON) internally, but the
   * API takes the zero address and returns pool addresses for it — so a
   * "wrapped TON" row would name something no quote path ever asks for.
   * ───────────────────────────────────────────────────────────────────────────
   */
  607: [
    { symbol: "TON", name: "Toncoin", address: "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c", decimals: 9, isNative: true, coingeckoId: "the-open-network", logoUrl: "https://coin-images.coingecko.com/coins/images/17980/large/photo_2024-09-10_17.09.00.jpeg" },
    // The REAL Tether, with the unicode glyph and 6 decimals.
    { symbol: "USD₮", name: "Tether USD", address: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs", decimals: 6, coingeckoId: "tether", logoUrl: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png" },
    { symbol: "jUSDT", name: "Bridged USDT", address: "EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA", decimals: 6, coingeckoId: "tether", logoUrl: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png" },
    { symbol: "NOT", name: "Notcoin", address: "EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT", decimals: 9, coingeckoId: "notcoin", logoUrl: "https://coin-images.coingecko.com/coins/images/33453/large/CoinGecko_Icon.png" },
  ],
  /**
   * ───────────────────────────────────────────────────────────────────────────
   * TRON — every symbol and decimal below read from the chain over TronGrid.
   *
   * TWO THINGS THE PROBE CAUGHT:
   *
   *   1. THE DECIMALS ARE MIXED, and not the way the intuition says. TRX and the
   *      stablecoins are SIX; USDD, SUN and JST are EIGHTEEN. Assuming 18 across
   *      the chain overstates every USDT amount by a factor of a trillion, and
   *      assuming 6 understates USDD by the same.
   *
   *   2. WRAPPED BTC IS SYMBOLLED `BTC`, not WBTC — the same thing Fantom does.
   *      Seeding it as "WBTC" would put a ticker on the picker that the chain,
   *      the explorer and the user's wallet all disagree with.
   *
   * The native row uses the aggregator sentinel like every EVM chain, because
   * TRX genuinely has no contract — WTRX is a separate wrapper, exactly as WETH
   * is. That is the EVM shape, not Solana's.
   * ───────────────────────────────────────────────────────────────────────────
   */
  728126428: [
    { symbol: "TRX", name: "TRON", address: NATIVE_SENTINEL, decimals: 6, isNative: true, coingeckoId: "tron", logoUrl: "https://coin-images.coingecko.com/coins/images/1094/large/tron-logo.png" },
    { symbol: "WTRX", name: "Wrapped TRX", address: "TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR", decimals: 6, coingeckoId: "wrapped-tron", logoUrl: "https://coin-images.coingecko.com/coins/images/1094/large/tron-logo.png" },
    { symbol: "USDT", name: "Tether USD", address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", decimals: 6, coingeckoId: "tether", logoUrl: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png" },
    { symbol: "USDC", name: "USD Coin", address: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8", decimals: 6, coingeckoId: "usd-coin", logoUrl: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png" },
    // EIGHTEEN decimals, unlike the two stablecoins above it. Probed.
    { symbol: "JST", name: "JUST", address: "TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9", decimals: 18, coingeckoId: "just", logoUrl: "https://coin-images.coingecko.com/coins/images/11095/large/JUST.jpg" },
    // The chain's own symbol is `BTC`, not `WBTC`.
    { symbol: "BTC", name: "Bitcoin (TRON)", address: "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9", decimals: 8, coingeckoId: "wrapped-bitcoin", logoUrl: "https://coin-images.coingecko.com/coins/images/7598/large/WBTCLOGO.png" },
  ],
  /**
   * ───────────────────────────────────────────────────────────────────────────
   * SOLANA — and three things about this block differ from every one above.
   *
   * 1. THE NATIVE ROW CARRIES A REAL MINT, NOT THE SENTINEL. On EVM the native
   *    coin has no contract, so `0xee…ee` is a convention every aggregator
   *    agreed on. Solana's SOL has an actual mint — wrapped SOL,
   *    `So111…1112` — and Jupiter quotes it directly. Using a sentinel here
   *    would mean inventing an address for a token that already has one, and
   *    every quote would have to translate it back.
   *
   *    That makes the native row and the wrapped row THE SAME MINT, so this
   *    chain gets ONE row for SOL where an EVM chain gets two (ETH + WETH). The
   *    `(chainId, address)` unique index would reject the duplicate anyway.
   *
   * 2. DECIMALS ARE NOT 18. SOL is 9, and the SPL stablecoins are 6 — the same
   *    as their Ethereum issuances but for a different reason (SPL mints carry
   *    their own decimals; there is no ERC-20 convention pulling toward 18).
   *    BONK is **5**, which looks like a typo and is not.
   *
   * 3. ADDRESSES ARE CASE-SIGNIFICANT. Every character below matters. See
   *    `normalizeTokenAddress` — these must never pass through `.toLowerCase()`.
   *
   * The set is the six most liquid Jupiter routes: SOL, both stablecoins, the
   * ecosystem's own governance token, the liquid-staking SOL that most Solana
   * holders actually hold, and BONK as the one high-volume memecoin whose
   * absence a user would notice.
   * ───────────────────────────────────────────────────────────────────────────
   */
  1399811149: [
    { symbol: "SOL", name: "Solana", address: "So11111111111111111111111111111111111111112", decimals: 9, isNative: true, coingeckoId: "solana", logoUrl: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png" },
    { symbol: "USDC", name: "USD Coin", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, coingeckoId: "usd-coin", logoUrl: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png" },
    { symbol: "USDT", name: "Tether USD", address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6, coingeckoId: "tether", logoUrl: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png" },
    { symbol: "JUP", name: "Jupiter", address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", decimals: 6, coingeckoId: "jupiter-exchange-solana", logoUrl: "https://coin-images.coingecko.com/coins/images/34188/large/jup.png" },
    { symbol: "JitoSOL", name: "Jito Staked SOL", address: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", decimals: 9, coingeckoId: "jito-staked-sol", logoUrl: "https://coin-images.coingecko.com/coins/images/28046/large/JitoSOL-200.png" },
    // FIVE decimals. Not a typo — BONK's mint declares 5.
    { symbol: "BONK", name: "Bonk", address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", decimals: 5, coingeckoId: "bonk", logoUrl: "https://coin-images.coingecko.com/coins/images/28600/large/bonk.jpg" },
  ],
};

async function tableExists(queryInterface, table) {
  const result = await queryInterface.sequelize.query(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = '${table}'`,
    { type: queryInterface.sequelize.QueryTypes.SELECT }
  );
  return result[0].count > 0;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, "dex_token"))) {
      console.log(
        "dex_token table does not exist yet (dex extension not installed), skipping dex majors seeder"
      );
      return;
    }

    // Every chain in DEX_MAJORS is seeded, whether or not a `dex_chain` row
    // exists yet and whether or not it is enabled.
    //
    // The obvious alternative — seed only chains "present and enabled" — seeds
    // NOTHING on a fresh install and so defeats this file's entire purpose:
    // `setupDex()` creates the chain rows at BOOT (after seeders run) and
    // deliberately creates them DISABLED, so a status filter here would find an
    // empty table. Tokens on a chain that is off are unreachable anyway — the
    // allowlist refuses them at condition 2, CHAIN_DISABLED — so seeding ahead
    // of the chain row costs nothing and makes enabling a chain a one-click
    // action instead of a data-entry session.
    const now = new Date();
    const rows = [];

    for (const [chainId, tokens] of Object.entries(DEX_MAJORS)) {
      tokens.forEach((token, index) => {
        rows.push({
          id: uuidv4(),
          chainId: Number(chainId),
          // VM-aware — raw SQL does not run the model's setter, and lowercasing
          // a base58 mint names a different account. See normalizeTokenAddress.
          address: normalizeTokenAddress(token.address),
          vm: vmForTokenAddress(token.address),
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          isNative: token.isNative === true,
          logoUrl: token.logoUrl ?? null,
          coingeckoId: token.coingeckoId ?? null,
          // The majors ARE the curated set. Unlike an import, this file is the
          // operator-equivalent decision that ships with the product.
          status: true,
          listing: "ALLOWLISTED",
          riskLevel: null,
          riskScore: null,
          riskSource: null,
          riskFlags: null,
          riskCheckedAt: null,
          /*
            ══════════════════════════════════════════════════════════════════
            "TOKENLIST", NOT "MANUAL", AND THE DIFFERENCE IS VISIBLE TO EVERY
            USER.

            The comment three lines up already says what these rows are — the
            curated set, shipped with the product — and then wrote the value
            that means the OPPOSITE. `MANUAL` is the column's default and means
            "a human pasted this contract address", which is the one thing these
            are not: they come from `tokenlist.json`, the same kind of source
            `admin/dex/token/import.post.ts` marks `TOKENLIST`.

            The token picker reads it and, quite correctly, refuses to trust a
            hand-pasted row: it renders a LETTER AVATAR instead of the logo and
            prints the full contract address beside the symbol, so the user can
            check what they are about to trade. With every seeded major marked
            MANUAL, that treatment applied to WETH, USDC, USDT, DAI and WBTC —
            the whole picker looked like a list of unverified contracts, logos
            and all sitting unused in the database.
            ══════════════════════════════════════════════════════════════════
          */
          verifiedSource: "TOKENLIST",
          ecosystemTokenId: null,
          sortOrder: index,
          notes: null,
          metadata: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });
      });
    }

    await queryInterface.bulkInsert("dex_token", rows, {
      // The idempotence contract, and the reason `listing` and `status` are
      // absent from it. See the header note.
      /*
        `vm` IS IN THE UPDATE SET, unlike `listing` and `status`. Those two are
        operator decisions and re-running must never undo them; `vm` is a
        protocol fact, and an install seeded before the column existed carries
        the EVM default on every row — including its Solana and TRON ones, which
        the model then refuses to write. Correcting it on a re-run is the repair.
      */
      updateOnDuplicate: ["symbol", "name", "decimals", "logoUrl", "coingeckoId", "sortOrder", "vm", "updatedAt"],
    });

    console.log(
      `Seeded ${rows.length} DEX major tokens across ${Object.keys(DEX_MAJORS).length} chains (allowlisted; re-runs never re-enable a disabled token)`
    );
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, "dex_token"))) return;

    // Hard delete rather than the model's soft delete: `down` is an
    // uninstall/rollback path, and leaving soft-deleted rows behind would make
    // a re-run of `up` hit the unique index on rows nothing can see.
    for (const [chainId, tokens] of Object.entries(DEX_MAJORS)) {
      await queryInterface.bulkDelete("dex_token", {
        chainId: Number(chainId),
        address: tokens.map((t) => normalizeTokenAddress(t.address)),
      });
    }
  },
};
