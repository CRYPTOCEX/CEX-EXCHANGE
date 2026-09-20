/**
 * The EVM signer.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * THIS IS ONE OF ONLY TWO FILES THAT MAY CALL `requireSeed()`.
 *
 * The other is `signers/ed25519.ts`. Everything else in this product — the
 * provider, the hooks, the UI — reaches signing through the approval queue, so
 * "did the user consent to this?" is answerable by reading `approval.ts` and
 * these two files, rather than by auditing every branch of a provider.
 *
 * `grep -rn "requireSeed" frontend/` should return this file, its ed25519
 * sibling, and the session module that defines it. A third result is a finding.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type PublicClient,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

import { requireSeed } from "../session";
import { derivePrivateKey } from "../derive";
import { evmChain, evmRpcUrl } from "../chains";
import { RPC_ERROR, WalletRpcError, type EvmTransactionRequest } from "../approval";

/**
 * A viem account for one derivation index.
 *
 * NOT CACHED, and that is deliberate. Caching would mean holding a live signer
 * across a lock — the whole point of auto-lock is that the key stops existing —
 * and the derivation is a single HMAC chain, cheap enough that the cache would
 * be optimising the wrong thing.
 */
function accountFor(index: number): PrivateKeyAccount {
  const key = derivePrivateKey(requireSeed(), "EVM", index);
  return privateKeyToAccount(bytesToHex(key));
}

/**
 * The transport every read and write goes through.
 *
 * ── AN EXPLICIT URL, AND `retryCount: 0` ────────────────────────────────────
 * `http()` with no argument uses viem's default endpoint for the chain, and
 * five of the twelve are unusable from a browser — see `BROWSER_RPC` in
 * `../chains`. `evmRpcUrl` resolves the operator's endpoint first and a
 * measured public one second.
 *
 * The retry count is zero because viem's default of 3 turns one unreachable
 * chain into four identical failures. Reading fifteen networks at once, that is
 * the difference between a handful of console lines and forty — and the noise
 * hides the failures that matter. One attempt per chain, one honest error, and
 * the caller reports the chain as unreadable.
 */
function transportFor(chainId: number) {
  return http(evmRpcUrl(chainId), { retryCount: 0, timeout: 10_000 });
}

/** Read-only client. No key involved, so it is safe to call while locked. */
export function evmPublicClient(chainId: number): PublicClient {
  const chain = requireChain(chainId);
  return createPublicClient({ chain, transport: transportFor(chainId) }) as PublicClient;
}

/**
 * `personal_sign`.
 *
 * viem's `signMessage` applies the `\x19Ethereum Signed Message:\n` prefix, and
 * that prefix is the whole reason `personal_sign` is safe: it makes the payload
 * un-representable as an RLP transaction, so a site cannot get a transaction
 * signed by asking for a signature. Signing raw bytes instead would hand any
 * caller a blank cheque — which is why viem's `sign()` is not used here and must
 * not be.
 */
export async function signEvmMessage(
  message: string,
  index = 0
): Promise<Hex> {
  const account = accountFor(index);
  /*
    HEX IN MEANS BYTES, NOT TEXT. `personal_sign` passes the message as a hex
    string, and treating "0x48656c6c6f" as the literal eleven characters would
    produce a signature that recovers to the right address for the WRONG
    message — a signature the site then rejects with no explanation. viem
    distinguishes the two through `{ raw }`.
  */
  return isHexString(message)
    ? account.signMessage({ message: { raw: message as Hex } })
    : account.signMessage({ message });
}

/** `eth_signTypedData_v4`. */
export async function signEvmTypedData(
  typedData: Record<string, unknown>,
  index = 0
): Promise<Hex> {
  const account = accountFor(index);
  return account.signTypedData(typedData as never);
}

/**
 * Build, sign and broadcast.
 *
 * ── WHAT IS FILLED IN AND WHAT IS PASSED THROUGH ────────────────────────────
 * `nonce`, `gas` and the fee fields are filled in by viem when absent, from the
 * chain the wallet is on. `to`, `value` and `data` are NEVER touched: `data` is
 * the aggregator's calldata, it encodes the route and the minimum output, and
 * rewriting a byte of it means quoting one swap and broadcasting another. The
 * DEX addon's server-side calldata-hash binding would (correctly) refuse to
 * record the result.
 */
export async function sendEvmTransaction(
  transaction: EvmTransactionRequest,
  chainId: number,
  index = 0
): Promise<Hex> {
  const chain = requireChain(chainId);
  const account = accountFor(index);

  const client = createWalletClient({
    account,
    chain,
    /* Same endpoint the reads use, but retries ARE allowed here: a dropped
       broadcast is worth attempting again, where a dropped balance read is
       just noise. */
    transport: http(evmRpcUrl(chainId), { timeout: 15_000 }),
  });

  return client.sendTransaction({
    to: (transaction.to ?? undefined) as `0x${string}` | undefined,
    data: (transaction.data ?? undefined) as Hex | undefined,
    value: toBigInt(transaction.value),
    gas: toBigInt(transaction.gas),
    nonce: toNumber(transaction.nonce),
    // Legacy and 1559 are mutually exclusive in viem's union; passing both
    // throws. Whichever the caller supplied is the one that survives.
    ...(transaction.gasPrice
      ? { gasPrice: toBigInt(transaction.gasPrice) }
      : {
          maxFeePerGas: toBigInt(transaction.maxFeePerGas),
          maxPriorityFeePerGas: toBigInt(transaction.maxPriorityFeePerGas),
        }),
  } as never);
}

/**
 * Estimate what a transaction will cost, for the review sheet.
 *
 * NO KEY IS USED, on purpose: this runs while the confirmation dialog is being
 * drawn, which is BEFORE the user has agreed to anything. `from` is passed as a
 * plain address so the node simulates against the right account without this
 * function ever touching the seed.
 */
export async function estimateEvmTransaction(
  transaction: EvmTransactionRequest,
  chainId: number,
  from: string
): Promise<{ gas: bigint; maxFeePerGas: bigint; totalWei: bigint }> {
  const client = evmPublicClient(chainId);

  const gas =
    toBigInt(transaction.gas) ??
    (await client
      .estimateGas({
        account: from as `0x${string}`,
        to: (transaction.to ?? undefined) as `0x${string}` | undefined,
        data: (transaction.data ?? undefined) as Hex | undefined,
        value: toBigInt(transaction.value) ?? BigInt(0),
      })
      .catch(() =>
        /*
          A revert during estimation is NOT a reason to block the dialog. The
          user may be approving a transaction that only becomes valid after an
          approval earlier in the same queue, and refusing to render a fee is
          worse than rendering a conservative one. 21,000 is the floor for any
          transaction that exists at all.
        */
        BigInt(21_000)
      ));

  const fees = await client.estimateFeesPerGas().catch(() => null);
  const maxFeePerGas =
    toBigInt(transaction.maxFeePerGas) ??
    fees?.maxFeePerGas ??
    (await client.getGasPrice().catch(() => BigInt(0)));

  return { gas, maxFeePerGas, totalWei: gas * maxFeePerGas };
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

function requireChain(chainId: number) {
  const chain = evmChain(chainId);
  if (!chain) {
    // 4902 is the code every dapp already handles as "ask the user to add this
    // chain", which is the correct prompt for a chain this build cannot reach.
    throw new WalletRpcError(
      RPC_ERROR.UNRECOGNIZED_CHAIN,
      `This wallet does not support chain ${chainId}.`
    );
  }
  return chain;
}

function isHexString(value: string): boolean {
  return /^0x[0-9a-fA-F]*$/.test(value);
}

function bytesToHex(bytes: Uint8Array): Hex {
  let out = "0x";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out as Hex;
}

/**
 * `undefined` when absent — NOT `0n`.
 *
 * viem treats an absent field as "fill this in for me" and a present `0` as
 * "the user meant zero". Coercing missing gas to 0 produces a transaction that
 * is broadcast with no gas limit and rejected by the node, and coercing a
 * missing nonce to 0 replaces the account's first-ever transaction.
 */
function toBigInt(value: string | undefined): bigint | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  try {
    return BigInt(value);
  } catch {
    throw new WalletRpcError(
      RPC_ERROR.INVALID_PARAMS,
      `Not a valid quantity: ${String(value)}`
    );
  }
}

function toNumber(value: string | undefined): number | undefined {
  const asBigInt = toBigInt(value);
  return asBigInt === undefined ? undefined : Number(asBigInt);
}
