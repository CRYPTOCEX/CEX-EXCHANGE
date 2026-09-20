/**
 * The Solana and TON signer.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * THE SECOND AND LAST FILE PERMITTED TO CALL `requireSeed()`. See `evm.ts` for
 * why that list is short and why it is checkable with one grep.
 *
 * ── WHY BOTH CHAINS SHARE A FILE ────────────────────────────────────────────
 * Because at this layer they are the same operation: ed25519 over a byte
 * string. Everything that differs between them — what those bytes MEAN, how a
 * transaction is assembled, how it is broadcast — lives above this, in the
 * per-chain send paths. Splitting the signature itself into two files would
 * duplicate thirty lines and invite them to drift.
 *
 * ── WHAT THIS FILE DOES NOT DO ──────────────────────────────────────────────
 * It does not build transactions. A Solana transaction needs a recent blockhash
 * and a fee payer; a TON transfer needs a seqno and a wallet-contract external
 * message. Both are network-dependent and belong with the code that talks to
 * the network, not with the code that holds the key.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { ed25519 } from "@noble/curves/ed25519";

import { derivePrivateKey, derivePublicKeyHex } from "../derive";
import { requireSeed } from "../session";
import type { WalletVm } from "../types";

/**
 * Sign arbitrary bytes with the ed25519 key for `vm` at `index`.
 *
 * ── THE 32 BYTES ARE A SEED, NOT AN EXPANDED KEY ────────────────────────────
 * SLIP-0010 yields the ed25519 SEED, which is what `@noble/curves` expects and
 * what every Solana and TON library expects. The distinction matters because a
 * 64-byte "secret key" in Solana tooling is `seed || publicKey`, and feeding
 * those 64 bytes to a function that wants 32 either throws or — worse, in some
 * libraries — silently signs with the wrong half.
 */
export function signEd25519(
  vm: Extract<WalletVm, "SOLANA" | "TON">,
  message: Uint8Array,
  index = 0
): Uint8Array {
  const key = derivePrivateKey(requireSeed(), vm, index);
  return ed25519.sign(message, key);
}

/**
 * Verify against this wallet's own public key.
 *
 * NOT USED ON THE SIGNING PATH — it is a self-check for the tests and for the
 * one place it earns its keep: proving after an import that the restored key
 * actually signs for the address the vault claims. A wallet that displays a
 * receive address it cannot spend from is the worst failure this product has,
 * and it is silent without a check like this.
 */
export function verifyEd25519(
  vm: Extract<WalletVm, "SOLANA" | "TON">,
  message: Uint8Array,
  signature: Uint8Array,
  index = 0
): boolean {
  const publicKey = derivePublicKeyHex(requireSeed(), vm, index);
  try {
    return ed25519.verify(signature, message, hexToBytes(publicKey));
  } catch {
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
