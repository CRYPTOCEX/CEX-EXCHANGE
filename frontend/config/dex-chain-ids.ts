/**
 * The chain ids this build's wallet layer can actually switch to.
 *
 * A PROJECTION of `networks` in `config/wallet.tsx`, kept in its own leaf module
 * for one reason: importing `config/wallet.tsx` evaluates it, and evaluating it
 * constructs the wagmi adapter (or, on a build with no
 * NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID, silently constructs nothing and hands
 * back a throwing proxy) and pulls the whole web3 stack into whatever imported
 * it. The admin readiness console needs the ids and none
 * of that.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THIS IS THE THIRD COPY OF ONE LIST, AND THAT IS ONLY SAFE BECAUSE A TEST SAYS
 * SO. `DEX_CHAIN_STATIC` (backend), `networks` (config/wallet.tsx) and this
 * array must carry identical ids, and `chain-registry.test.ts` asserts all
 * three in every direction. Adding a chain means editing all three in one
 * commit; the build fails otherwise, which is the only reason a third copy is
 * acceptable at all.
 *
 * WHY THE CONSOLE NEEDS IT. The server cannot answer "can a wallet reach this
 * chain" — the answer lives in the frontend bundle that was built and shipped,
 * and an operator who updates the backend while serving a stale bundle has
 * exactly the state where the two disagree. The readiness console reads this
 * array so it can report such a chain as UNREACHABLE rather than as ready,
 * which is the visible half of P7.4's acceptance criterion.
 * ────────────────────────────────────────────────────────────────────────────
 */
export const DEX_WALLET_CHAIN_IDS: readonly number[] = [
  1, // Ethereum
  10, // Optimism
  25, // Cronos
  30, // Rootstock
  56, // BNB Smart Chain
  137, // Polygon
  250, // Fantom Opera
  8453, // Base
  42161, // Arbitrum One
  42220, // Celo
  43114, // Avalanche
  59144, // Linea
  607, // TON — invented; TON's own global id is -239, which cannot be a key
  728126428, // TRON — a REAL chain id that fits, unlike Solana's
  1399811149, // Solana — see SOLANA_CHAIN_ID below
];

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SOLANA'S ID IS A TRANSLATION, AND IT IS THE ONLY ONE IN THE ADDON.
 *
 * Every other entry above is an EIP-155 chain id — a number the chain itself
 * agrees to, that a wallet is asked to switch to, that a signature commits to.
 * Solana has none of that. AppKit identifies it by CAIP-2, whose id is the
 * base58 GENESIS HASH `5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`, and `Number()` of that
 * is NaN.
 *
 * So this number is ours. It is the platform's primary key for "Solana
 * mainnet", chosen to fit `dexChain.chainId`, which is a signed MySQL INTEGER
 * capped at 2147483647 — the id LI.FI uses (1151111081099710) would SATURATE
 * rather than error, collapsing every Solana row onto the same key as any other
 * overflow. It is never sent to an RPC, never shown to a wallet, and never
 * signed over.
 *
 * `appKitNetworkToChainId` below is the single place that crosses between the
 * two worlds. Anything else calling `Number(network.id)` gets NaN on Solana,
 * silently — which reads as "chain 0" in a comparison and matches nothing.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const SOLANA_CHAIN_ID = 1399811149;

/** AppKit's CAIP-2 reference for Solana mainnet-beta: the genesis hash. */
export const SOLANA_CAIP_REFERENCE = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

/**
 * Map an AppKit network id — `number | string` — onto this platform's chainId.
 *
 * Returns null rather than NaN for anything unrecognised, because NaN survives
 * arithmetic and comparisons without throwing and ends up being compared against
 * a real chain id somewhere far away.
 */
export function appKitNetworkToChainId(id: unknown): number | null {
  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (typeof id !== "string") return null;

  // CAIP-2 form (`solana:5eykt4…`) or the bare reference.
  const reference = id.includes(":") ? id.split(":").pop() ?? "" : id;
  if (reference === SOLANA_CAIP_REFERENCE) return SOLANA_CHAIN_ID;

  // An EVM network id can arrive as a decimal string from some AppKit paths.
  const numeric = Number(reference);
  return Number.isFinite(numeric) && reference.trim() !== "" ? numeric : null;
}

/** TRON mainnet: 0x2b6653dc, the id TronLink and every bridge report. */
export const TRON_CHAIN_ID = 728126428;

/**
 * TON mainnet.
 *
 * INVENTED, and for a different reason from Solana's. TON's own global id is
 * **-239** — negative, so it cannot be a primary key in a column every chain
 * shares. Solana's id was too LARGE for the column; TON's is not a natural
 * number at all.
 */
export const TON_CHAIN_ID = 607;

/**
 * Which VM a chain id runs on, for the client's own branching.
 *
 * TRON's id is REAL (0x2b6653dc, what TronLink and every bridge report) and
 * fits the INTEGER column, so unlike Solana's it needed no invention. The two
 * are listed separately here rather than being derived from a range, because
 * "is it a made-up id" is not a property a number carries.
 */
export function vmForChainId(chainId: number): "EVM" | "SVM" | "TVM" | "TON" {
  const id = Number(chainId);
  if (id === SOLANA_CHAIN_ID) return "SVM";
  if (id === TRON_CHAIN_ID) return "TVM";
  if (id === TON_CHAIN_ID) return "TON";
  return "EVM";
}

/** Can a connected wallet be switched to this chain by this build? */
export function isWalletReachableChain(chainId: number): boolean {
  return DEX_WALLET_CHAIN_IDS.includes(Number(chainId));
}
