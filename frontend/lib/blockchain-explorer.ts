/**
 * Block-explorer links for on-chain transactions and addresses.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * A withdrawal's only proof that the money actually left is its on-chain hash,
 * and the only useful thing a user can do with a hash is open it on a block
 * explorer. Until now the platform could do that on the DEPOSIT side only
 * (`finance/deposit/components/deposit-helpers.ts`), so the one flow where
 * users most want the receipt — "where did my withdrawal go?" — had no link at
 * all, and the hash was never rendered outside the admin panel.
 *
 * The deposit helper is now a thin wrapper over this module, so deposits and
 * withdrawals resolve the same chain to the same explorer.
 *
 * TWO CHAIN VOCABULARIES
 * ----------------------
 * The two withdrawal engines label the network differently, and a resolver
 * that knows only one of them silently mislinks the other:
 *
 *   - ECOSYSTEM (custodial, on-chain): `metadata.chain` is the platform's own
 *     chain symbol — "ETH", "BSC", "TRON", "BTC", "SOL"… — matching the keys of
 *     `backend/src/api/(ext)/ecosystem/utils/chains.ts`.
 *   - SPOT (routed through a ccxt exchange): `metadata.chain` is the
 *     EXCHANGE'S network code — "ERC20", "TRC20", "BEP20", "MATIC", "AVAXC" —
 *     which varies by provider and is never the platform symbol.
 *
 * `NETWORK_ALIASES` folds the second vocabulary onto the first. Anything
 * unrecognised resolves to `null` rather than to a guess: a wrong explorer link
 * reads as "your transaction does not exist", which is worse than no link.
 *
 * TESTNETS
 * --------
 * `chains.ts` keys every explorer by chain AND network, so an installation
 * running on Sepolia or Shasta needs the testnet host or every link 404s. The
 * network comes from the transaction's own `metadata.network` (stamped from
 * `ecosystemToken.network` when the withdrawal is created); rows written before
 * that existed, and every spot withdrawal, fall back to mainnet — which is
 * correct for spot, since exchanges only ever pay out on mainnet.
 */

/** Explorer hosts per chain, keyed by the network names `chains.ts` uses. */
type ExplorerEntry = {
  /** Network key -> template. `{hash}` is substituted; nothing else is. */
  tx: Record<string, string>;
  address?: Record<string, string>;
  /** Network key used when the row does not name one. */
  defaultNetwork: string;
};

/**
 * Network keys are the ones `backend/src/api/(ext)/ecosystem/utils/chains.ts`
 * declares, not invented ones — POLYGON's mainnet is "matic" and its testnet
 * "amoy", TRON's testnets are "shasta" and "nile". A key that does not appear
 * there can never be looked up.
 *
 * Mainnet values are carried over verbatim from the deposit helper wherever it
 * had one, so this consolidation cannot change where an existing deposit link
 * points. The additions are the testnet hosts and the chains the deposit helper
 * never covered (BASE, CELO, RSK, HECO, CRONOS, MO — and FTM, which it listed
 * under the name "FANTOM" that no chain ever actually uses, making every Fantom
 * link fall through to the search fallback).
 */
const EXPLORERS: Record<string, ExplorerEntry> = {
  ETH: {
    defaultNetwork: "mainnet",
    tx: {
      mainnet: "https://etherscan.io/tx/{hash}",
      sepolia: "https://sepolia.etherscan.io/tx/{hash}",
    },
    address: {
      mainnet: "https://etherscan.io/address/{hash}",
      sepolia: "https://sepolia.etherscan.io/address/{hash}",
    },
  },
  BSC: {
    defaultNetwork: "mainnet",
    tx: {
      mainnet: "https://bscscan.com/tx/{hash}",
      testnet: "https://testnet.bscscan.com/tx/{hash}",
    },
    address: {
      mainnet: "https://bscscan.com/address/{hash}",
      testnet: "https://testnet.bscscan.com/address/{hash}",
    },
  },
  POLYGON: {
    // Not "mainnet": chains.ts names Polygon's live network "matic". The
    // generic names are accepted as aliases anyway, because the value on the
    // row comes from an operator-set `POLYGON_NETWORK` env var and "mainnet" is
    // the spelling a human reaches for. Since an unrecognised network now
    // refuses to link rather than defaulting, that spelling would otherwise
    // cost every Polygon withdrawal its link.
    defaultNetwork: "matic",
    tx: {
      matic: "https://polygonscan.com/tx/{hash}",
      mainnet: "https://polygonscan.com/tx/{hash}",
      amoy: "https://amoy.polygonscan.com/tx/{hash}",
      testnet: "https://amoy.polygonscan.com/tx/{hash}",
    },
    address: {
      matic: "https://polygonscan.com/address/{hash}",
      mainnet: "https://polygonscan.com/address/{hash}",
      amoy: "https://amoy.polygonscan.com/address/{hash}",
      testnet: "https://amoy.polygonscan.com/address/{hash}",
    },
  },
  FTM: {
    defaultNetwork: "mainnet",
    tx: {
      mainnet: "https://ftmscan.com/tx/{hash}",
      testnet: "https://testnet.ftmscan.com/tx/{hash}",
    },
    address: {
      mainnet: "https://ftmscan.com/address/{hash}",
      testnet: "https://testnet.ftmscan.com/address/{hash}",
    },
  },
  OPTIMISM: {
    defaultNetwork: "mainnet",
    tx: {
      mainnet: "https://optimistic.etherscan.io/tx/{hash}",
      sepolia: "https://sepolia-optimism.etherscan.io/tx/{hash}",
    },
    address: {
      mainnet: "https://optimistic.etherscan.io/address/{hash}",
      sepolia: "https://sepolia-optimism.etherscan.io/address/{hash}",
    },
  },
  ARBITRUM: {
    defaultNetwork: "mainnet",
    tx: {
      mainnet: "https://arbiscan.io/tx/{hash}",
      sepolia: "https://sepolia.arbiscan.io/tx/{hash}",
    },
    address: {
      mainnet: "https://arbiscan.io/address/{hash}",
      sepolia: "https://sepolia.arbiscan.io/address/{hash}",
    },
  },
  BASE: {
    defaultNetwork: "mainnet",
    tx: {
      mainnet: "https://basescan.org/tx/{hash}",
      sepolia: "https://sepolia.basescan.org/tx/{hash}",
    },
    address: {
      mainnet: "https://basescan.org/address/{hash}",
      sepolia: "https://sepolia.basescan.org/address/{hash}",
    },
  },
  CELO: {
    // `alfajores` is Celo's long-standing testnet and the name an operator is
    // most likely to have in `CELO_NETWORK`, even though chains.ts models only
    // the newer `sepolia` one.
    defaultNetwork: "mainnet",
    tx: {
      mainnet: "https://celoscan.io/tx/{hash}",
      sepolia: "https://sepolia.celoscan.io/tx/{hash}",
      alfajores: "https://alfajores.celoscan.io/tx/{hash}",
    },
    address: {
      mainnet: "https://celoscan.io/address/{hash}",
      sepolia: "https://sepolia.celoscan.io/address/{hash}",
      alfajores: "https://alfajores.celoscan.io/address/{hash}",
    },
  },
  // MO's explorer host IS the browsable site (chains.ts uses it for the API
  // too, because MO runs its own Blockscout rather than an Etherscan API).
  MO: {
    defaultNetwork: "mainnet",
    tx: {
      mainnet: "https://mainnet.mochain.app/tx/{hash}",
      testnet: "https://testnet.mochain.app/tx/{hash}",
    },
    address: {
      mainnet: "https://mainnet.mochain.app/address/{hash}",
      testnet: "https://testnet.mochain.app/address/{hash}",
    },
  },
  RSK: {
    defaultNetwork: "mainnet",
    tx: {
      mainnet: "https://rootstock.blockscout.com/tx/{hash}",
      testnet: "https://rootstock-testnet.blockscout.com/tx/{hash}",
    },
    address: {
      mainnet: "https://rootstock.blockscout.com/address/{hash}",
      testnet: "https://rootstock-testnet.blockscout.com/address/{hash}",
    },
  },
  HECO: {
    defaultNetwork: "mainnet",
    tx: {
      mainnet: "https://hecoinfo.com/tx/{hash}",
      testnet: "https://testnet.hecoinfo.com/tx/{hash}",
    },
    address: {
      mainnet: "https://hecoinfo.com/address/{hash}",
      testnet: "https://testnet.hecoinfo.com/address/{hash}",
    },
  },
  CRONOS: {
    // chains.ts declares no Cronos testnet, so there is none to map.
    defaultNetwork: "mainnet",
    tx: { mainnet: "https://cronoscan.com/tx/{hash}" },
    address: { mainnet: "https://cronoscan.com/address/{hash}" },
  },
  // TRON's explorer is a hash-router: the "#" is part of the path, not a
  // fragment we may drop.
  TRON: {
    defaultNetwork: "mainnet",
    tx: {
      mainnet: "https://tronscan.org/#/transaction/{hash}",
      shasta: "https://shasta.tronscan.org/#/transaction/{hash}",
      nile: "https://nile.tronscan.org/#/transaction/{hash}",
    },
    address: {
      mainnet: "https://tronscan.org/#/address/{hash}",
      shasta: "https://shasta.tronscan.org/#/address/{hash}",
      nile: "https://nile.tronscan.org/#/address/{hash}",
    },
  },
  // Blockchair calls the endpoint "transaction", not "tx", and puts the testnet
  // in the path rather than on a subdomain.
  BTC: {
    defaultNetwork: "mainnet",
    tx: {
      mainnet: "https://blockchair.com/bitcoin/transaction/{hash}",
      testnet: "https://blockchair.com/bitcoin/testnet/transaction/{hash}",
    },
    address: {
      mainnet: "https://blockchair.com/bitcoin/address/{hash}",
      testnet: "https://blockchair.com/bitcoin/testnet/address/{hash}",
    },
  },
  LTC: {
    defaultNetwork: "mainnet",
    tx: { mainnet: "https://blockchair.com/litecoin/transaction/{hash}" },
    address: { mainnet: "https://blockchair.com/litecoin/address/{hash}" },
  },
  DOGE: {
    defaultNetwork: "mainnet",
    tx: { mainnet: "https://blockchair.com/dogecoin/transaction/{hash}" },
    address: { mainnet: "https://blockchair.com/dogecoin/address/{hash}" },
  },
  DASH: {
    defaultNetwork: "mainnet",
    tx: { mainnet: "https://blockchair.com/dash/transaction/{hash}" },
    address: { mainnet: "https://blockchair.com/dash/address/{hash}" },
  },
  // Solana's cluster is a query parameter, so it has to sit AFTER the hash.
  SOL: {
    defaultNetwork: "mainnet",
    tx: {
      mainnet: "https://solscan.io/tx/{hash}",
      testnet: "https://explorer.solana.com/tx/{hash}?cluster=testnet",
      devnet: "https://explorer.solana.com/tx/{hash}?cluster=devnet",
    },
    address: {
      mainnet: "https://solscan.io/account/{hash}",
      testnet: "https://explorer.solana.com/address/{hash}?cluster=testnet",
      devnet: "https://explorer.solana.com/address/{hash}?cluster=devnet",
    },
  },
  XMR: {
    defaultNetwork: "mainnet",
    tx: {
      mainnet: "https://xmrchain.net/tx/{hash}",
      testnet: "https://community.rino.io/explorer/stagenet/tx/{hash}",
    },
    // Monero addresses are not indexed by any explorer — there is no public
    // address view to link to, so none is offered.
  },
  TON: {
    defaultNetwork: "mainnet",
    tx: {
      mainnet: "https://tonscan.org/tx/{hash}",
      testnet: "https://testnet.tonscan.org/tx/{hash}",
    },
    address: {
      mainnet: "https://tonscan.org/address/{hash}",
      testnet: "https://testnet.tonscan.org/address/{hash}",
    },
  },
  AVALANCHE: {
    // Not an ecosystem chain, but the deposit helper carried it and spot
    // exchanges pay AVAX out over "AVAXC". Kept so neither regresses.
    defaultNetwork: "mainnet",
    tx: { mainnet: "https://snowtrace.io/tx/{hash}" },
    address: { mainnet: "https://snowtrace.io/address/{hash}" },
  },
};

/**
 * Exchange network codes and common spellings -> the chain keys above.
 *
 * These are what SPOT withdrawals record. ccxt passes the exchange's own label
 * straight through, so the same chain arrives as "ERC20" from one provider and
 * "ETH" or "Ethereum (ERC20)" from another; matching is done on the normalised
 * form (upper-cased, non-alphanumerics stripped) so spacing and punctuation
 * cannot cause a miss.
 */
const NETWORK_ALIASES: Record<string, string> = {
  // Ethereum
  ETHEREUM: "ETH",
  ERC20: "ETH",
  ETHERC20: "ETH",
  ETHEREUMERC20: "ETH",
  // BNB Smart Chain. BEP2 is the old Beacon Chain and is NOT BSC, so it is
  // deliberately absent: linking a BEP2 hash to bscscan finds nothing.
  BEP20: "BSC",
  BSCBEP20: "BSC",
  BNBSMARTCHAIN: "BSC",
  BNBSMARTCHAINBEP20: "BSC",
  BNB: "BSC",
  BSCSCAN: "BSC",
  // Polygon
  MATIC: "POLYGON",
  POLYGONMATIC: "POLYGON",
  POL: "POLYGON",
  // Tron
  TRC20: "TRON",
  TRX: "TRON",
  TRONTRC20: "TRON",
  // Solana
  SOLANA: "SOL",
  SPL: "SOL",
  SOLSPL: "SOL",
  // Bitcoin & friends
  BITCOIN: "BTC",
  LITECOIN: "LTC",
  DOGECOIN: "DOGE",
  MONERO: "XMR",
  // Layer 2s / other EVMs
  ARB: "ARBITRUM",
  ARBITRUMONE: "ARBITRUM",
  ARBONE: "ARBITRUM",
  OP: "OPTIMISM",
  OPTIMISMETHEREUM: "OPTIMISM",
  FANTOM: "FTM",
  OPBNB: "BSC",
  AVAX: "AVALANCHE",
  AVAXC: "AVALANCHE",
  AVAXCCHAIN: "AVALANCHE",
  CCHAIN: "AVALANCHE",
  CRO: "CRONOS",
  CRONOSCHAIN: "CRONOS",
  HT: "HECO",
  HECOCHAIN: "HECO",
  RBTC: "RSK",
  ROOTSTOCK: "RSK",
  TONCOIN: "TON",
  THEOPENNETWORK: "TON",
};

/** Upper-case and drop everything that is not a letter or digit. */
function normalize(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * What a transaction hash looks like on each chain family.
 *
 * This exists for ONE caller: the fallback that reads a hash out of
 * `referenceId`. When an admin completes a withdrawal by hand, the backend
 * demands a value in `referenceId` and its own error text calls it a
 * "transaction hash OR WIRE REFERENCE"
 * (`api/admin/finance/withdraw/log/[id]/index.put.ts`) — so half the values in
 * that column are bank references, exchange payout ids and ticket numbers.
 * Linking one of those to a block explorer produces a confident "transaction
 * not found" page about the user's own money, which is worse than showing no
 * link at all.
 *
 * `trxId` needs no such check — it is only ever written by broadcast code that
 * already holds a real hash — and deliberately does not get one, so a chain
 * whose hash shape is not described here keeps working.
 */
const HASH_SHAPES: Record<string, RegExp> = {
  // EVM: 0x + 32 bytes.
  EVM: /^0x[0-9a-fA-F]{64}$/,
  // Bitcoin-family and TRON txids: 32 bytes, bare hex, no prefix.
  HEX64: /^[0-9a-fA-F]{64}$/,
  // Solana signatures are base58-encoded 64-byte values (no 0, O, I or l).
  BASE58_SIG: /^[1-9A-HJ-NP-Za-km-z]{86,90}$/,
  // TON reports either a base64/base64url message hash or bare hex.
  TON: /^(?:[A-Za-z0-9+/_-]{43,44}={0,2}|[0-9a-fA-F]{64})$/,
};

const CHAIN_HASH_SHAPE: Record<string, RegExp> = {
  ETH: HASH_SHAPES.EVM,
  BSC: HASH_SHAPES.EVM,
  POLYGON: HASH_SHAPES.EVM,
  FTM: HASH_SHAPES.EVM,
  OPTIMISM: HASH_SHAPES.EVM,
  ARBITRUM: HASH_SHAPES.EVM,
  BASE: HASH_SHAPES.EVM,
  CELO: HASH_SHAPES.EVM,
  MO: HASH_SHAPES.EVM,
  RSK: HASH_SHAPES.EVM,
  HECO: HASH_SHAPES.EVM,
  CRONOS: HASH_SHAPES.EVM,
  AVALANCHE: HASH_SHAPES.EVM,
  TRON: HASH_SHAPES.HEX64,
  BTC: HASH_SHAPES.HEX64,
  LTC: HASH_SHAPES.HEX64,
  DOGE: HASH_SHAPES.HEX64,
  DASH: HASH_SHAPES.HEX64,
  XMR: HASH_SHAPES.HEX64,
  SOL: HASH_SHAPES.BASE58_SIG,
  TON: HASH_SHAPES.TON,
};

/**
 * Whether `value` has the shape of an on-chain hash for `chain`.
 *
 * False for an unknown chain: this gates a fallback, so "cannot tell" must mean
 * "do not link".
 */
export function looksLikeTxHash(
  chain: string | null | undefined,
  value: string | null | undefined
): boolean {
  if (!value || typeof value !== "string") return false;
  const key = resolveExplorerChain(chain);
  if (!key) return false;
  const shape = CHAIN_HASH_SHAPE[key];
  return shape ? shape.test(value.trim()) : false;
}

/**
 * Resolve any chain label — platform symbol or exchange network code — to a
 * key of `EXPLORERS`. Returns null when the label is not recognised.
 */
export function resolveExplorerChain(chain?: string | null): string | null {
  if (!chain || typeof chain !== "string") return null;
  const key = normalize(chain);
  if (!key) return null;
  if (EXPLORERS[key]) return key;
  const aliased = NETWORK_ALIASES[key];
  return aliased && EXPLORERS[aliased] ? aliased : null;
}

/** Whether a clickable explorer link can be produced for this chain. */
export function hasExplorer(chain?: string | null): boolean {
  return resolveExplorerChain(chain) !== null;
}

function build(
  table: Record<string, string> | undefined,
  entry: ExplorerEntry,
  hash: string,
  network?: string | null
): string | null {
  if (!table) return null;

  /* An ABSENT network means the row predates `metadata.network`, or is a spot
     payout (exchanges settle on mainnet only) — both are the chain's default,
     so defaulting is right and is what keeps every historical row linkable.

     A network that is NAMED but unrecognised is the opposite case: the row is
     telling us it settled somewhere this table does not describe (an old
     testnet, a network added since). Defaulting there would quietly point a
     Goerli withdrawal at mainnet Etherscan, which answers that the user's
     transaction does not exist — the precise failure this module refuses to
     produce. No link; the hash is still shown and still copyable. */
  if (!network || !network.trim()) {
    const fallback = table[entry.defaultNetwork];
    return fallback ? fallback.replace("{hash}", encodeURIComponent(hash)) : null;
  }

  const template = table[normalize(network).toLowerCase()];
  if (!template) return null;
  return template.replace("{hash}", encodeURIComponent(hash));
}

/**
 * Browsable explorer URL for a transaction hash, or null when the chain is
 * unknown to us.
 *
 * Null is a real answer and callers must render it as "hash, no link" rather
 * than as a broken anchor — see `TransactionHash` in
 * `components/blocks/wallet/transaction-hash.tsx`.
 */
export function getExplorerTxUrl(
  chain: string | null | undefined,
  txHash: string | null | undefined,
  network?: string | null,
  /**
   * Explorer base recorded on the row itself, which WINS over the table above.
   *
   * Operator-defined custom chains are not in the table and cannot be — their
   * explorer is knowable only from the chain's own database row, which the
   * ecosystem withdrawal path copies into `metadata.explorerUrl`. It takes
   * precedence because an operator who has named an explorer for a chain knows
   * better than a compiled-in default what that chain's transactions are viewed
   * on; a custom symbol that happens to collide with a built-in key would
   * otherwise link to the wrong network entirely.
   */
  explorerBase?: string | null
): string | null {
  if (!txHash || typeof txHash !== "string" || !txHash.trim()) return null;
  const hash = txHash.trim();

  if (typeof explorerBase === "string" && /^https?:\/\//i.test(explorerBase.trim())) {
    // Blockscout, Etherscan and every custom EVM explorer share the /tx/ path;
    // custom chains here are always EVM (`isCustomEvmChain`).
    return `${explorerBase.trim().replace(/\/+$/, "")}/tx/${encodeURIComponent(hash)}`;
  }

  const key = resolveExplorerChain(chain);
  if (!key) return null;
  const entry = EXPLORERS[key];
  return build(entry.tx, entry, hash, network);
}

/** Browsable explorer URL for an address, or null when unavailable. */
export function getExplorerAddressUrl(
  chain: string | null | undefined,
  address: string | null | undefined,
  network?: string | null
): string | null {
  if (!address || typeof address !== "string" || !address.trim()) return null;
  const key = resolveExplorerChain(chain);
  if (!key) return null;
  const entry = EXPLORERS[key];
  return build(entry.address, entry, address.trim(), network);
}

/**
 * Middle-elided hash for display: a 64-character hash in a table cell either
 * blows the column out or wraps into three lines, and neither end of it is the
 * part a user checks. Both ends are kept because that is what someone
 * comparing against their wallet actually reads.
 */
export function shortenHash(hash: string, lead = 10, tail = 8): string {
  if (typeof hash !== "string") return "";
  const value = hash.trim();
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}
