/**
 * SLIP-0010 hierarchical derivation for ed25519.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS HAND-WRITTEN AND BIP-32 IS NOT.
 *
 * secp256k1 derivation (EVM, TRON) is BIP-32, and `@scure/bip32` already ships
 * it — viem re-exports `HDKey` from that very package, so it is present whether
 * we ask for it or not. ed25519 derivation (Solana, TON) is a DIFFERENT
 * construction: SLIP-0010, hardened-only, no public-parent derivation, a
 * different curve seed string. `@scure/bip32` does not do it, and nothing else
 * in this frontend's dependency set does either.
 *
 * The alternative was `ed25519-hd-key` — a new frontend dependency for the
 * thirty lines below, on the code path that decides where a user's money lives.
 * It is instead the INDEPENDENT IMPLEMENTATION this file is checked against:
 * the backend already depends on it, and `derive.test.ts` freezes addresses
 * that were produced by it rather than by this file.
 *
 * IF YOU CHANGE ANYTHING HERE, the test does not merely fail — every existing
 * user's Solana and TON addresses change, and their funds stay at addresses
 * nothing in the product points at any more.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Reference: https://github.com/satoshilabs/slips/blob/master/slip-0010.md
 */

import { hmac } from "@noble/hashes/hmac";
import { sha512 } from "@noble/hashes/sha2";

/**
 * SLIP-0010's curve constant for ed25519. It is the HMAC KEY of the master
 * step — not a salt, not a prefix — which is why it is bytes of an ASCII
 * string rather than anything derived.
 */
const ED25519_CURVE = new TextEncoder().encode("ed25519 seed");

const HARDENED_OFFSET = 0x80000000;

export interface Slip10Node {
  /** 32 bytes. For ed25519 this is the *seed* of the keypair, not the keypair. */
  key: Uint8Array;
  chainCode: Uint8Array;
}

/**
 * Derive an ed25519 node from a BIP-39 seed along a hardened-only path.
 *
 * @param seed 64 bytes from `mnemonicToSeedSync`.
 * @param path e.g. `m/44'/501'/0'/0'`. EVERY segment must be hardened.
 *
 * THE HARDENED CHECK THROWS RATHER THAN COERCING, and that is the important
 * decision in this file. SLIP-0010 has no non-hardened derivation for ed25519 —
 * there is no valid answer to `m/44'/501'/0'/0`. An implementation that
 * silently hardened it anyway would accept a path a user copied from an EVM
 * tutorial and hand them a real, funded, WRONG address, with nothing anywhere
 * reporting a problem. Refusing is the only outcome that cannot lose money.
 */
export function derivePathEd25519(seed: Uint8Array, path: string): Slip10Node {
  const segments = parsePath(path);

  let I = hmac(sha512, ED25519_CURVE, seed);
  let key = I.slice(0, 32);
  let chainCode = I.slice(32);

  for (const index of segments) {
    /*
      The child data is `0x00 || key || index_be32`.

      The leading zero byte is NOT padding: for ed25519 the "private key" is a
      32-byte seed with no natural serialisation prefix, and SLIP-0010 uses the
      0x00 to keep the input the same width as secp256k1's 33-byte compressed
      point. Dropping it produces a self-consistent derivation that agrees with
      no other wallet on earth.
    */
    const data = new Uint8Array(1 + 32 + 4);
    data[0] = 0x00;
    data.set(key, 1);
    new DataView(data.buffer, data.byteOffset, data.byteLength).setUint32(
      33,
      index >>> 0,
      /* littleEndian */ false
    );

    I = hmac(sha512, chainCode, data);
    key = I.slice(0, 32);
    chainCode = I.slice(32);
  }

  return { key, chainCode };
}

/** `m/44'/501'/0'/0'` -> `[0x8000002C, 0x800001F5, 0x80000000, 0x80000000]`. */
function parsePath(path: string): number[] {
  const parts = path.split("/");
  if (parts[0] !== "m") {
    throw new Error(`SLIP-0010 path must start with "m": ${path}`);
  }

  return parts.slice(1).map((segment) => {
    if (!segment.endsWith("'")) {
      throw new Error(
        `SLIP-0010 ed25519 has no unhardened derivation, and "${segment}" in ` +
          `"${path}" is unhardened. Every segment must end with an apostrophe.`
      );
    }
    const n = Number.parseInt(segment.slice(0, -1), 10);
    if (!Number.isInteger(n) || n < 0 || n >= HARDENED_OFFSET) {
      throw new Error(`Invalid path segment "${segment}" in "${path}"`);
    }
    // `>>> 0` because the sum exceeds 2^31 and would otherwise go negative.
    return (n + HARDENED_OFFSET) >>> 0;
  });
}
