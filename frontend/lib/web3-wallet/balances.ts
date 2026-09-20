/**
 * What the wallet actually holds.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * READS ONLY. No key is touched here and none can be — `evmPublicClient` builds
 * a client with no account attached, so there is nothing to sign with even by
 * accident. That is why this file is safe to call while the wallet is LOCKED,
 * which it must be: the hub shows a portfolio before anyone types a password.
 *
 * ── WHY IT PROBES A LIST INSTEAD OF ASKING "WHAT DO I OWN?" ─────────────────
 * Because no chain answers that question. `eth_getBalance` returns the native
 * balance and nothing else; discovering ERC-20 holdings requires either an
 * indexer (a third party we would be telling which addresses belong to our
 * users) or scanning every Transfer event ever emitted. Every wallet that shows
 * you a token list is either using an indexer or probing a list it already had.
 *
 * We probe a list, in ONE multicall per chain. The consequence is honest and
 * has to be stated in the UI: a token nobody has curated will not appear even
 * though the balance is really there and really spendable. `sendToken` therefore
 * accepts an arbitrary contract address, so a user who knows what they hold is
 * never locked out of moving it.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import type { Address } from "viem";

import { evmChain } from "./chains";
import { evmPublicClient } from "./signers/evm";

/**
 * The three functions a balance row needs.
 *
 * Written out rather than imported from the swap terminal's `erc20.ts`: this
 * directory is deliberately free of imports from `app/`, so it can be used by
 * the provider shims that run before React exists.
 */
export const ERC20_READ_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

/** `transfer(address,uint256)`, the only write this file's callers need. */
export const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

/**
 * The aggregator sentinel this platform already uses for "the native asset".
 *
 * Matches `dexToken.address`'s convention, stated in that model: the native
 * asset gets a real value so the `(chainId, address)` unique index still holds.
 * Anything comparing against it must do so case-insensitively.
 */
export const NATIVE_SENTINEL = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export function isNativeAsset(address: string | null | undefined): boolean {
  return (
    !address ||
    address.toLowerCase() === NATIVE_SENTINEL ||
    address === "0x0000000000000000000000000000000000000000"
  );
}

export interface TokenRef {
  address: string;
  symbol: string;
  decimals: number;
  logoUrl?: string | null;
}

export interface AssetBalance extends TokenRef {
  /** null when the read FAILED — which is not the same as zero. */
  balance: bigint | null;
  native: boolean;
}

/**
 * Native + every token in `tokens`, in one round trip.
 *
 * `null` FOR A FAILED READ, NEVER ZERO. A non-standard token that reverts
 * `balanceOf`, or an RPC that drops one call out of thirty, must not render as
 * "you have none" — that is a claim about the user's money, and it is the claim
 * that makes someone think funds have vanished. The UI shows an em dash.
 */
export async function readEvmBalances(
  address: string,
  chainId: number,
  tokens: TokenRef[]
): Promise<AssetBalance[]> {
  const chain = evmChain(chainId);
  if (!chain) return [];

  const client = evmPublicClient(chainId);
  const erc20 = tokens.filter((t) => !isNativeAsset(t.address));

  const [nativeBalance, tokenResults] = await Promise.all([
    client.getBalance({ address: address as Address }).catch(() => null),
    erc20.length
      ? client
          .multicall({
            // `allowFailure: true` IS MANDATORY — one reverting token must not
            // blank the whole panel. The other rows are still the user's money.
            allowFailure: true,
            contracts: erc20.map((token) => ({
              address: token.address as Address,
              abi: ERC20_READ_ABI,
              functionName: "balanceOf" as const,
              args: [address as Address],
            })),
          })
          .catch(() => erc20.map(() => ({ status: "failure" as const })))
      : Promise.resolve([]),
  ]);

  const rows: AssetBalance[] = [
    {
      address: NATIVE_SENTINEL,
      symbol: chain.nativeCurrency.symbol,
      decimals: chain.nativeCurrency.decimals,
      balance: nativeBalance,
      native: true,
    },
  ];

  erc20.forEach((token, index) => {
    const result = tokenResults[index] as
      | { status: "success"; result: bigint }
      | { status: "failure" }
      | undefined;
    rows.push({
      ...token,
      native: false,
      balance: result?.status === "success" ? result.result : null,
    });
  });

  return rows;
}

/**
 * Look up a token the curated list does not carry.
 *
 * The escape hatch the header promises. Returns null rather than throwing when
 * the address is not an ERC-20 — a user pasting a wallet address into a token
 * field is a typo, not an exception.
 */
export async function readTokenMetadata(
  contract: string,
  chainId: number,
  holder?: string
): Promise<AssetBalance | null> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(contract)) return null;

  const client = evmPublicClient(chainId);
  try {
    /*
      TYPED ON THE WAY OUT, NOT THE WAY IN. Casting the CONTRACTS array to
      `never` (the obvious way to build it conditionally) makes viem infer the
      RESULTS as `never[]` too, and every `.status` read below becomes a type
      error. Casting the result to the shape multicall actually returns keeps
      the reads honest and the array conditional.
    */
    type Row = { status: "success"; result: unknown } | { status: "failure" };
    const results = (await client.multicall({
      allowFailure: true,
      contracts: [
        { address: contract as Address, abi: ERC20_READ_ABI, functionName: "symbol" },
        { address: contract as Address, abi: ERC20_READ_ABI, functionName: "decimals" },
        ...(holder
          ? [
              {
                address: contract as Address,
                abi: ERC20_READ_ABI,
                functionName: "balanceOf" as const,
                args: [holder as Address],
              },
            ]
          : []),
      ] as never,
    })) as unknown as Row[];

    const symbol = results[0]?.status === "success" ? String(results[0].result) : null;
    const decimals =
      results[1]?.status === "success" ? Number(results[1].result) : null;

    // Both are required. A contract that answers neither is not a token, and
    // guessing 18 decimals is how a transfer moves a millionth of what it said.
    if (!symbol || decimals === null || !Number.isInteger(decimals)) return null;

    return {
      address: contract.toLowerCase(),
      symbol,
      decimals,
      native: false,
      balance:
        results[2]?.status === "success" ? (results[2].result as bigint) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Parse a typed amount into base units, without floating point.
 *
 * `Number("0.1") * 1e18` IS 100000000000000000**0**.**0000000002** — a real,
 * observed rounding error that produces a `BigInt` conversion throw or, worse,
 * a transfer of the wrong amount. This is string arithmetic end to end.
 *
 * @returns null when the input is not a valid amount for `decimals`.
 */
export function parseAmount(input: string, decimals: number): bigint | null {
  /*
    A NON-STRING IS REFUSED, INCLUDING A NUMBER, and that is the strictest rule
    in this file rather than an oversight.

    `String(42)` is "42" and would parse perfectly well — but a caller holding a
    JS `number` has ALREADY lost precision before this function sees it.
    `0.1 + 0.2` reaches us as "0.30000000000000004", which on an 18-decimal
    token is a perfectly valid amount and the WRONG one. Refusing the type is
    the only way to keep the guarantee that no float ever reaches a transfer;
    accepting it would move the bug one call site upstream where nothing checks.
  */
  if (typeof input !== "string") return null;

  const text = input.trim();
  if (!/^\d*\.?\d*$/.test(text) || text === "" || text === ".") return null;

  const [whole = "", fraction = ""] = text.split(".");
  // More decimal places than the token has is a user error worth naming, not
  // something to silently truncate — truncating sends less than they typed.
  if (fraction.length > decimals) return null;

  const padded = fraction.padEnd(decimals, "0");
  try {
    return BigInt(`${whole || "0"}${padded || ""}`);
  } catch {
    return null;
  }
}
