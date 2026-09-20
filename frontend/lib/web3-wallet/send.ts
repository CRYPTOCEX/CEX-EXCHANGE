/**
 * Moving funds out of the wallet.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * A SEND GOES THROUGH THE SAME REVIEW SHEET A DAPP'S TRANSACTION DOES.
 *
 * It would have been easy to give the wallet's own send form a private path —
 * we composed the transaction, so what is there to review? Two things:
 *
 *  1. The RECIPIENT. It is the one field the user typed, it is the field a
 *     clipboard-hijacker rewrites, and the review sheet is the last place it can
 *     be compared against what they meant to type. Trusting our own form here
 *     would remove the only check that catches an address swap.
 *  2. The FEE. On an L1 at a bad moment the fee can exceed the transfer, and a
 *     form that has already estimated it should show it before, not after.
 *
 * So `sendEvmAsset` builds a transaction and hands it to `askToSign`, exactly as
 * `eth_sendTransaction` does. The sheet cannot tell the two apart, which is the
 * point.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { encodeFunctionData, type Address } from "viem";

import { ERC20_TRANSFER_ABI, isNativeAsset } from "./balances";
import { RPC_ERROR, WalletRpcError, type EvmTransactionRequest } from "./approval";
import { askToSign } from "./gate";
import { addressFor } from "./session";
import type { WalletVm } from "./types";
import { estimateEvmTransaction, sendEvmTransaction } from "./signers/evm";

export interface SendEvmInput {
  chainId: number;
  /** The ERC-20 contract, or a native sentinel. See `balances.ts`. */
  asset: string;
  to: string;
  /** Base units. Already parsed — this module never sees a decimal string. */
  amount: bigint;
  accountIndex?: number;
}

/**
 * Build, review and broadcast a transfer.
 *
 * @returns the transaction hash.
 * @throws {WalletRpcError} 4001 when the user declines.
 */
export async function sendEvmAsset({
  chainId,
  asset,
  to,
  amount,
  accountIndex = 0,
}: SendEvmInput): Promise<`0x${string}`> {
  const from = addressFor("EVM", accountIndex);
  if (!from) {
    throw new WalletRpcError(
      RPC_ERROR.UNAUTHORIZED,
      "No wallet is available on this account."
    );
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(to)) {
    throw new WalletRpcError(RPC_ERROR.INVALID_PARAMS, "That is not a valid address.");
  }
  if (amount <= BigInt(0)) {
    throw new WalletRpcError(RPC_ERROR.INVALID_PARAMS, "Enter an amount above zero.");
  }

  const transaction: EvmTransactionRequest = isNativeAsset(asset)
    ? { from, to, value: `0x${amount.toString(16)}` }
    : {
        from,
        // A TOKEN TRANSFER SENDS ZERO NATIVE VALUE TO THE **CONTRACT**, not to
        // the recipient. Putting the recipient in `to` here would send native
        // currency to them and move no tokens at all — the classic mistake, and
        // one that succeeds on-chain, which is why it is worth naming.
        to: asset,
        value: "0x0",
        data: encodeFunctionData({
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [to as Address, amount],
        }),
      };

  await askToSign({
    kind: "sendTransaction",
    vm: "EVM",
    chainId,
    address: from,
    transaction,
  });

  return sendEvmTransaction(transaction, chainId, accountIndex);
}

/* ── the other three VMs ──────────────────────────────────────────────────── */

export interface NonEvmSendInput {
  vm: Extract<WalletVm, "SOLANA" | "TON" | "TRON">;
  chainId: number;
  from: string;
  to: string;
  /** Base units. */
  amount: bigint;
  symbol: string;
  decimals: number;
  /** SPL mint / TRC-20 contract. Null for the native asset. */
  contract?: string | null;
  comment?: string | null;
  accountIndex?: number;
}

/**
 * Build, review and broadcast on Solana, TON or TRON.
 *
 * ── THE SAME THREE STEPS AS EVM, IN THE SAME ORDER ──────────────────────────
 * unlock, consent, sign — through `askToSign`, which is the single copy of that
 * sequence. What differs per VM is only how a transfer is assembled, and each
 * signer owns that: Solana builds a transaction locally, TRON builds one over
 * HTTP at the node, TON has the server build it because the message format
 * needs a library the browser cannot carry.
 *
 * EVERY SIGNER IS IMPORTED DYNAMICALLY. `@solana/web3.js` alone is ~200 kB, and
 * a user who never touches Solana should not pay for it to open their wallet.
 */
export async function sendNonEvmAsset({
  vm,
  chainId,
  from,
  to,
  amount,
  symbol,
  decimals,
  contract,
  comment,
  accountIndex = 0,
}: NonEvmSendInput): Promise<string> {
  if (amount <= BigInt(0)) {
    throw new WalletRpcError(RPC_ERROR.INVALID_PARAMS, "Enter an amount above zero.");
  }

  /*
    THE FEE AND THE RENT WARNING ARE COMPUTED BEFORE THE PROMPT, not after.
    On Solana a transfer to someone with no token account for this mint costs
    the SENDER about 0.002 SOL in rent — an asymmetry with every other chain
    here, and one the user has to be told about while deciding, not once it has
    already been spent.
  */
  let feeLabel: string | undefined;
  let createsTokenAccount = false;

  if (vm === "SOLANA") {
    const { associatedTokenAddress, estimateSolanaFee } = await import("./signers/solana");
    if (contract) {
      const { readSplBalances } = await import("./signers/solana");
      /*
        The recipient's account exists iff it already holds this mint — but a
        `null` here is "could not read", not "holds nothing". Treating the two
        alike would warn about rent on every transfer whenever the endpoint
        blocks enumeration, training the user to ignore the warning. On an
        unknown, say nothing; the send itself creates the account if needed.
      */
      const held = await readSplBalances(to, chainId).catch(() => null);
      createsTokenAccount = held === null ? false : !held.some((row) => row.mint === contract);
      // Touch the derivation so a malformed mint fails here, with a message
      // about the token, rather than mid-broadcast.
      await associatedTokenAddress(to, contract).catch(() => {
        throw new WalletRpcError(RPC_ERROR.INVALID_PARAMS, "That is not a valid mint.");
      });
    }
    const fee = await estimateSolanaFee(chainId, createsTokenAccount);
    feeLabel = `~${formatBaseUnits(fee, 9, 6)} SOL`;
  } else if (vm === "TON") {
    const { TON_FEE_ESTIMATE_NANO } = await import("./signers/ton");
    feeLabel = `~${formatBaseUnits(TON_FEE_ESTIMATE_NANO, 9, 4)} TON`;
  }
  /*
    TRON GETS NO FEE LABEL, AND THAT IS HONEST RATHER THAN LAZY. TRON charges
    bandwidth and energy, both of which an account receives a free daily
    allowance of. A plain TRX transfer is usually free; a TRC-20 transfer costs
    burnt TRX only when the account has no energy. Any number here would be
    wrong most of the time, in both directions.
  */

  await askToSign({
    kind: "sendAsset",
    vm,
    chainId,
    address: from,
    to,
    symbol,
    amount: amount.toString(),
    decimals,
    feeLabel,
    createsTokenAccount,
  });

  if (vm === "SOLANA") {
    const { sendSolanaAsset } = await import("./signers/solana");
    return sendSolanaAsset({ chainId, mint: contract ?? null, to, amount, accountIndex });
  }
  if (vm === "TON") {
    const { sendTonAsset } = await import("./signers/ton");
    return sendTonAsset({ from, to, amount, comment, accountIndex });
  }
  const { sendTronAsset } = await import("./signers/tron");
  return sendTronAsset({
    chainId,
    contract: contract ?? null,
    to,
    amount,
    from,
    accountIndex,
  });
}

/**
 * Base units -> a short decimal, for a label.
 *
 * A local copy rather than an import from `decode-calldata`, which is an EVM
 * module — this file would otherwise pull the calldata decoder into the bundle
 * of a user who only ever sends TRX.
 */
function formatBaseUnits(value: bigint, decimals: number, maxFraction: number): string {
  const base = BigInt(10) ** BigInt(decimals);
  const whole = value / base;
  const fraction = (value % base).toString().padStart(decimals, "0").slice(0, maxFraction);
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : String(whole);
}

/**
 * The largest native amount that can actually be sent, fee included.
 *
 * ── WHY "MAX" ON A NATIVE ASSET IS NOT THE BALANCE ──────────────────────────
 * The fee is paid in the same asset, so sending the whole balance leaves nothing
 * to pay with and the transaction is rejected before it is mined. Every wallet
 * withholds something; the honest question is how much.
 *
 * A 20% HEADROOM ON THE ESTIMATE, and the direction matters: base fee can rise
 * between the estimate and inclusion, and a Max that turns out to be a few wei
 * too large fails after the user has confirmed it. Withholding slightly too
 * much leaves dust; withholding too little wastes their time and their nerve.
 *
 * @returns 0n rather than a negative when the fee exceeds the balance — the
 *          caller renders "not enough to cover the fee", which is the true
 *          statement, instead of a nonsensical negative Max.
 */
export async function maxNativeSendable(
  balance: bigint,
  chainId: number,
  from: string,
  to?: string
): Promise<bigint> {
  const { totalWei } = await estimateEvmTransaction(
    {
      from,
      // A PLAIN SEND TO A CONTRACT COSTS MORE THAN 21,000 GAS, so the estimate
      // is taken against the real recipient when we have one. Falling back to
      // `from` keeps it a well-formed estimate before an address is typed.
      to: to && /^0x[0-9a-fA-F]{40}$/.test(to) ? to : from,
      value: "0x1",
    },
    chainId,
    from
  );

  const headroom = (totalWei * BigInt(120)) / BigInt(100);
  return balance > headroom ? balance - headroom : BigInt(0);
}
