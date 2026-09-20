/**
 * A TON wallet address, computed without `@ton/core`.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT `@ton/core`, WHICH WOULD HAVE BEEN THREE LINES.
 *
 * Two reasons, and the second is the one that decided it:
 *
 *  1. `@ton/core` uses Node's `Buffer` throughout, as a GLOBAL. This frontend's
 *     bundler config sets `buffer: false` in `resolve.fallback`
 *     (frontend/next.config.js) — deliberately, for the @reown packages — so
 *     `@ton/core` in the browser is a runtime `Buffer is not defined`, not a
 *     build error. It would have worked in the unit suite and failed on the
 *     page.
 *
 *  2. It made derivation ASYNC. `@ton/core` had to be dynamically imported to
 *     keep its cell serialiser out of every bundle, which made the TON address
 *     a promise, which made the whole four-VM derivation a promise, for the sake
 *     of one sha256 over 100 bytes.
 *
 * What replaces it is the TON cell REPRESENTATION HASH, which is fully
 * specified and, for the two cells a wallet address needs, small:
 *
 *     repr  = d1 || d2 || augmented_data || (ref depths, be16) || (ref hashes)
 *     hash  = sha256(repr)
 *
 * `ton-address.test.ts` asserts the output equals `@ton/core`'s own
 * `contractAddress()` for several keys, so the shortcut is checked against the
 * thing it replaced rather than trusted.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { sha256 } from "@noble/hashes/sha2";

/**
 * WalletContractV4R2's code cell, as a hash and a depth.
 *
 * PINNED RATHER THAN PARSED. The code is a 724-byte BOC that never changes, and
 * parsing it at runtime would mean shipping a BOC deserialiser to learn a
 * constant. These two values were produced by `@ton/core` from the canonical
 * base64 (recorded in `plans/WEB3-WALLET-SYSTEM.md` §3) and are re-derived from
 * it in the test.
 */
const V4R2_CODE_HASH = hexToBytes(
  "feb5ff6820e2ff0d9483e7e0d62c817d846789fb4ae580c878866d959dabd5c0"
);
const V4R2_CODE_DEPTH = 7;

/** V4's default subwallet id, to which the workchain is added. */
export const TON_DEFAULT_WALLET_ID = 698983191;

export interface TonAddressOptions {
  /** 0 = basechain. -1 (masterchain) is not a place a user wallet belongs. */
  workchain?: 0;
  walletId?: number;
  /**
   * `false` -> the "UQ…" form, and that is the default for a REASON.
   *
   * A bounceable ("EQ…") address returns anything sent to a contract that is
   * not yet deployed — and a fresh wallet is exactly that until its first
   * outgoing message. Showing EQ as a receive address means the user's very
   * first deposit bounces back to the sender. Every TON wallet shows UQ here.
   */
  bounceable?: boolean;
  testOnly?: boolean;
}

/**
 * The V4R2 wallet address for an ed25519 public key.
 *
 * @param publicKey 32 bytes.
 */
export function tonV4R2Address(
  publicKey: Uint8Array,
  options: TonAddressOptions = {}
): string {
  const {
    workchain = 0,
    walletId = TON_DEFAULT_WALLET_ID + workchain,
    bounceable = false,
    testOnly = false,
  } = options;

  if (publicKey.length !== 32) {
    throw new Error(`TON public key must be 32 bytes, got ${publicKey.length}`);
  }

  /*
    THE DATA CELL: seqno(32) = 0, walletId(32), publicKey(256), plugins bit = 0.

    321 bits, which is not a whole number of bytes — and that is why the
    augmented representation below is not an optional detail. A cell whose bit
    length is not byte-aligned carries a trailing 1 bit marking where the data
    ends, and omitting it yields a different hash and therefore a different,
    wrong, fully-valid-looking address.
  */
  const dataBits = 32 + 32 + 256 + 1;
  const data = new Uint8Array(41);
  // seqno = 0 occupies bytes 0..3 and is already zero.
  data[4] = (walletId >>> 24) & 0xff;
  data[5] = (walletId >>> 16) & 0xff;
  data[6] = (walletId >>> 8) & 0xff;
  data[7] = walletId & 0xff;
  data.set(publicKey, 8);
  // The plugins bit is 0, i.e. bit 320, which is already zero.

  const dataHash = cellHash(data, dataBits, []);

  /*
    THE STATE-INIT CELL: five flag bits and two refs.

      0 - split_depth absent
      0 - special absent
      1 - code present      -> ref 0
      1 - data present      -> ref 1
      0 - library absent

    `0b00110` in the top five bits of one byte.
  */
  const stateInitHash = cellHash(new Uint8Array([0b00110000]), 5, [
    { hash: V4R2_CODE_HASH, depth: V4R2_CODE_DEPTH },
    { hash: dataHash, depth: 0 },
  ]);

  return toUserFriendly(stateInitHash, workchain, bounceable, testOnly);
}

/* ── cell representation ──────────────────────────────────────────────────── */

interface CellRef {
  hash: Uint8Array;
  depth: number;
}

/**
 * sha256 of a cell's representation.
 *
 * Ordinary cells only — no exotic cells, no non-zero level. A wallet's
 * state-init contains neither, and supporting them would mean carrying a level
 * mask and pruned-branch handling for code paths this file will never take.
 */
function cellHash(
  data: Uint8Array,
  bitLength: number,
  refs: CellRef[]
): Uint8Array {
  /*
    d1 encodes ref count, exotic-ness and level: `refs + 8*exotic + 32*level`.
    Both of the latter are zero here, so d1 is the ref count.

    d2 encodes the data length TWICE — floor and ceil of bits/8 — which is how a
    reader recovers whether the last byte is full or augmented. It is not a
    redundant field; `2*ceil` and `2*floor` are different values that mean
    different things.
  */
  const d1 = refs.length;
  const d2 = (bitLength >> 3) + ((bitLength + 7) >> 3);

  const byteLength = (bitLength + 7) >> 3;
  const body = new Uint8Array(byteLength);
  body.set(data.subarray(0, byteLength));

  const remainder = bitLength % 8;
  if (remainder !== 0) {
    // Augmented representation: keep the meaningful bits, set the next one to
    // 1, zero the rest.
    const i = bitLength >> 3;
    const keep = (0xff << (8 - remainder)) & 0xff;
    body[i] = (body[i] & keep) | (1 << (7 - remainder));
  }

  const repr = new Uint8Array(2 + byteLength + refs.length * 2 + refs.length * 32);
  let o = 0;
  repr[o++] = d1;
  repr[o++] = d2;
  repr.set(body, o);
  o += byteLength;
  // ALL depths, then ALL hashes — not interleaved per ref.
  for (const ref of refs) {
    repr[o++] = (ref.depth >> 8) & 0xff;
    repr[o++] = ref.depth & 0xff;
  }
  for (const ref of refs) {
    repr.set(ref.hash, o);
    o += 32;
  }

  return sha256(repr);
}

/* ── user-friendly encoding ───────────────────────────────────────────────── */

/**
 * `tag || workchain || hash32 || crc16` in url-safe base64.
 *
 * The tag byte carries both flags: 0x11 bounceable / 0x51 non-bounceable, with
 * 0x80 OR-ed in for testnet. That is why a testnet address looks nothing like
 * its mainnet counterpart despite being the same account.
 */
function toUserFriendly(
  hash: Uint8Array,
  workchain: number,
  bounceable: boolean,
  testOnly: boolean
): string {
  let tag = bounceable ? 0x11 : 0x51;
  if (testOnly) tag |= 0x80;

  const addr = new Uint8Array(34);
  addr[0] = tag;
  // Signed: masterchain is -1, which must serialise as 0xff, not 0xffffffff.
  addr[1] = workchain & 0xff;
  addr.set(hash, 2);

  const crc = crc16Xmodem(addr);
  const full = new Uint8Array(36);
  full.set(addr, 0);
  full[34] = (crc >> 8) & 0xff;
  full[35] = crc & 0xff;

  return base64UrlSafe(full);
}

/** CRC-16/XMODEM — poly 0x1021, init 0x0000, no reflection. TON's choice. */
function crc16Xmodem(data: Uint8Array): number {
  let crc = 0;
  for (const byte of data) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

/**
 * base64 with `-`/`_`, padding KEPT.
 *
 * TON's user-friendly form is 36 bytes, which is divisible by 3, so there is no
 * padding to strip — but stripping is what most url-safe helpers do, and a
 * helper that did would be a silent corruption for any future 34- or 35-byte
 * variant. Written out rather than reached for.
 */
function base64UrlSafe(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 =
    typeof btoa === "function"
      ? btoa(binary)
      : // Node, under the unit runner.
        Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_");
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
