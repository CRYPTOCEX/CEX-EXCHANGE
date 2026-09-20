/**
 * What is this transaction actually going to do?
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * THE ONE DECODE THAT JUSTIFIES THE FILE: `approve(spender, 2^256-1)`.
 *
 * An unlimited approval is the most consequential thing a user signs on-chain
 * and the least legible: it renders in a naive wallet as a transaction sending
 * 0 ETH to a token contract, which looks like nothing at all. It grants a
 * third-party contract permission to move that token out of the account
 * FOREVER, and it is the mechanism behind most drainer losses.
 *
 * So this decoder exists to turn `0x095ea7b3…ffffffff` into the sentence
 * "unlimited", and the review sheet renders that in a colour the user cannot
 * miss. Everything else here is a bonus.
 *
 * ── IT DECODES A SHORT LIST AND SAYS SO WHEN IT CANNOT ──────────────────────
 * There is no ABI registry in this product and fetching one would mean telling
 * a third party which contracts our users interact with. So five selectors are
 * decoded and an unknown one returns `null` — which the sheet renders as "this
 * wallet cannot read what this transaction does", a warning in its own right
 * rather than a blank space. Claiming to understand calldata we do not is worse
 * than admitting we do not.
 * ═════════════════════════════════════════════════════════════════════════════
 */

/** `uint256` max — the canonical "unlimited" approval. */
export const UINT256_MAX = (BigInt(1) << BigInt(256)) - BigInt(1);

/**
 * Anything at or above this is presented as unlimited.
 *
 * WHY A THRESHOLD AND NOT AN EQUALITY TEST. Routers do not all use `2^256-1`:
 * some use `2^255-1`, some `type(uint96).max`, and a drainer will happily use
 * `2^256-2` precisely because a wallet comparing for equality would then call it
 * a specific number and render eighty digits as though that were reassuring.
 * Any allowance beyond what a human could spend IS unlimited, whatever the
 * literal says.
 */
const EFFECTIVELY_UNLIMITED = BigInt(1) << BigInt(200);

export type DecodedCall =
  | {
      kind: "approve";
      spender: string;
      amount: bigint;
      unlimited: boolean;
      /** Revoking is `approve(spender, 0)` and deserves its own, calm, copy. */
      revoke: boolean;
    }
  | { kind: "transfer"; to: string; amount: bigint }
  | { kind: "transferFrom"; from: string; to: string; amount: bigint }
  | { kind: "wrap" }
  | { kind: "unwrap"; amount: bigint };

const SELECTOR = {
  approve: "0x095ea7b3",
  transfer: "0xa9059cbb",
  transferFrom: "0x23b872dd",
  /** WETH `deposit()` — wrapping native into its ERC-20 form. */
  deposit: "0xd0e30db0",
  /** WETH `withdraw(uint256)`. */
  withdraw: "0x2e1a7d4d",
} as const;

/**
 * @returns the decoded call, or `null` when the selector is not one of the five
 *          — which the UI must present as "unknown", never as "safe".
 */
export function decodeCalldata(data: string | undefined | null): DecodedCall | null {
  if (typeof data !== "string" || !data.startsWith("0x") || data.length < 10) {
    return null;
  }

  const selector = data.slice(0, 10).toLowerCase();
  // Every argument is a 32-byte word; `word(n)` is the nth of them.
  const word = (n: number): string => data.slice(10 + n * 64, 10 + (n + 1) * 64);
  const toAddress = (w: string): string =>
    w.length === 64 ? `0x${w.slice(24)}` : "0x";
  const toBigInt = (w: string): bigint => {
    try {
      return w ? BigInt(`0x${w}`) : BigInt(0);
    } catch {
      return BigInt(0);
    }
  };

  switch (selector) {
    case SELECTOR.approve: {
      const amount = toBigInt(word(1));
      return {
        kind: "approve",
        spender: toAddress(word(0)),
        amount,
        unlimited: amount >= EFFECTIVELY_UNLIMITED,
        revoke: amount === BigInt(0),
      };
    }
    case SELECTOR.transfer:
      return { kind: "transfer", to: toAddress(word(0)), amount: toBigInt(word(1)) };

    case SELECTOR.transferFrom:
      return {
        kind: "transferFrom",
        from: toAddress(word(0)),
        to: toAddress(word(1)),
        amount: toBigInt(word(2)),
      };

    case SELECTOR.deposit:
      return { kind: "wrap" };

    case SELECTOR.withdraw:
      return { kind: "unwrap", amount: toBigInt(word(0)) };

    default:
      return null;
  }
}

/**
 * `0x1234…abcd`. For addresses in a place where the full forty characters would
 * be noise — never where the user is being asked to VERIFY the address, which
 * is the one case truncation defeats.
 */
export function shortenAddress(address: string, lead = 6, tail = 4): string {
  const value = String(address ?? "");
  if (value.length <= lead + tail + 2) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

/**
 * Base units -> a human figure, without floating point.
 *
 * NEVER `Number(wei) / 1e18`. A double holds 15–16 significant digits and a
 * wei-denominated balance routinely has more, so that conversion silently drops
 * the low digits of the number the user is checking. This is string arithmetic
 * end to end.
 */
export function formatUnits(value: bigint, decimals: number, maxFraction = 6): string {
  const negative = value < BigInt(0);
  const abs = negative ? -value : value;
  const base = BigInt(10) ** BigInt(decimals);

  const whole = abs / base;
  const fraction = abs % base;

  let fractionText = fraction.toString().padStart(decimals, "0").slice(0, maxFraction);
  fractionText = fractionText.replace(/0+$/, "");

  const wholeText = whole.toLocaleString("en-US");
  return `${negative ? "-" : ""}${wholeText}${fractionText ? `.${fractionText}` : ""}`;
}
