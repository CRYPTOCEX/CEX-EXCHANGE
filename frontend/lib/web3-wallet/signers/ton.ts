/**
 * TON: balance, transfer, broadcast.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * THE MESSAGE IS BUILT ON THE SERVER; ONLY THE SIGNATURE HAPPENS HERE.
 *
 * That split is this addon's existing TON contract — `dex-invariants.mjs` states
 * it as *"a TON swap is a message the server builds and TON Connect signs"* —
 * and an in-house wallet changes only where the signature comes from. The two
 * server routes are `wallet/ton/prepare` and `wallet/ton/send`, and their
 * headers carry the reasoning.
 *
 * The practical reason it is not done here: building a TON message needs
 * `@ton/core`, which uses Node's `Buffer` as a global that this frontend sets to
 * `false`. The cell representation HASH is hand-rolled in `../ton-address.ts`
 * because an address must be derivable offline and it is fifty lines; full BOC
 * serialisation is a different size of problem.
 *
 * ── THE SERVER STILL NEVER SEES A KEY ───────────────────────────────────────
 * It receives a hash, gets back a signature and a public key, and verifies the
 * one against the other before broadcasting. Exactly what it receives from
 * Tonkeeper today.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { ed25519 } from "@noble/curves/ed25519";

import { $fetch } from "@/lib/api";

import { derivePrivateKey, derivePublicKeyHex } from "../derive";
import { requireSeed } from "../session";
import { rpcUrlFor } from "../non-evm-chains";
import { RPC_ERROR, WalletRpcError } from "../approval";

/** "UQ…"/"EQ…" and their testnet forms, plus the raw `0:hex` form. */
const TON_ADDRESS = /^([UEkK]Q[A-Za-z0-9_-]{46}|-?\d:[0-9a-fA-F]{64})$/;

export function isTonAddress(value: string): boolean {
  return TON_ADDRESS.test(String(value ?? "").trim());
}

/* ── reads ────────────────────────────────────────────────────────────────── */

/**
 * Nanotons. `null` on a failed read — never 0.
 *
 * Read straight from toncenter's REST endpoint rather than through our own
 * server: it is a public, CORS-enabled GET of a public fact, and routing it
 * through the backend would add a hop and a route for no gain. The SEND path
 * goes through the server for a real reason; this does not.
 */
export async function readTonBalance(
  address: string,
  chainId: number
): Promise<bigint | null> {
  try {
    const base = rpcUrlFor(chainId).replace(/\/jsonRPC$/, "");
    const response = await fetch(
      `${base}/getAddressBalance?address=${encodeURIComponent(address)}`
    );
    if (!response.ok) return null;
    const body = await response.json();
    if (body?.ok !== true || body?.result === undefined) return null;
    return BigInt(String(body.result));
  } catch {
    return null;
  }
}

/* ── signing ──────────────────────────────────────────────────────────────── */

/**
 * Sign a 32-byte cell hash with the wallet's ed25519 key.
 *
 * The 32 bytes from SLIP-0010 are the ed25519 SEED, which is what
 * `@noble/curves` expects. TON tooling sometimes calls `seed ‖ publicKey` the
 * "secret key"; passing those 64 bytes here signs with the wrong half.
 */
export function signTonHash(signingHashHex: string, accountIndex = 0): string {
  const key = derivePrivateKey(requireSeed(), "TON", accountIndex);
  const signature = ed25519.sign(hexToBytes(signingHashHex), key);
  return bytesToHex(signature);
}

/* ── sending ──────────────────────────────────────────────────────────────── */

export interface TonSendInput {
  from: string;
  to: string;
  /** Nanotons. */
  amount: bigint;
  comment?: string | null;
  accountIndex?: number;
}

interface PrepareResponse {
  bodyBoc: string;
  signingHash: string;
  seqno: number;
  validUntil: number;
  deployed: boolean;
}

/**
 * Prepare, sign, broadcast.
 *
 * @returns the message hash (base64) — TON has no transaction id until the
 *          message lands, so this is the only handle available at broadcast.
 */
export async function sendTonAsset({
  from,
  to,
  amount,
  comment,
  accountIndex = 0,
}: TonSendInput): Promise<string> {
  if (!isTonAddress(to)) {
    throw new WalletRpcError(
      RPC_ERROR.INVALID_PARAMS,
      "That is not a valid TON address."
    );
  }

  /*
    THE AMOUNT CROSSES THE WIRE AS A DECIMAL STRING. Nanotons are 1e9, so a real
    balance exceeds a double's exact integer range and `JSON.stringify` of a
    number would round the amount being transferred. The route parses it with
    `BigInt` for the same reason.
  */
  const { data: prepared, error: prepareError } = await $fetch<PrepareResponse>({
    url: "/api/dex/wallet/ton/prepare",
    method: "POST",
    body: { from, to, amount: amount.toString(), comment: comment ?? null },
    silent: true,
  });

  if (prepareError || !prepared?.signingHash) {
    throw new WalletRpcError(
      RPC_ERROR.INTERNAL,
      prepareError || "Could not prepare the TON transfer."
    );
  }

  const signature = signTonHash(prepared.signingHash, accountIndex);
  const publicKey = derivePublicKeyHex(requireSeed(), "TON", accountIndex);

  const { data: sent, error: sendError } = await $fetch<{ hash: string }>({
    url: "/api/dex/wallet/ton/send",
    method: "POST",
    body: {
      from,
      bodyBoc: prepared.bodyBoc,
      signature,
      publicKey,
      deployed: prepared.deployed,
    },
    silent: true,
  });

  if (sendError || !sent?.hash) {
    throw new WalletRpcError(
      RPC_ERROR.INTERNAL,
      sendError || "The TON network did not accept the transfer."
    );
  }

  return sent.hash;
}

/**
 * A flat estimate, in nanotons.
 *
 * TON fees are a few thousandths of a TON and are computed by the network from
 * the message's size and the gas it burns; there is no `eth_estimateGas`
 * equivalent to ask before sending. 0.01 TON is the figure every wallet shows
 * for a simple transfer and comfortably covers one, INCLUDING the extra cost of
 * the first message, which also deploys the wallet contract.
 */
export const TON_FEE_ESTIMATE_NANO = BigInt(10_000_000);

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}
