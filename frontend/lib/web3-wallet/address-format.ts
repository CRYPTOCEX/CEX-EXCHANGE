/**
 * Is this a plausible address on that chain?
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * A LEAF MODULE ON PURPOSE. It imports nothing, so a form can validate a TRON
 * address without pulling in the TRON signer, and a Solana address without
 * pulling 200 kB of `@solana/web3.js`. Validation runs on every keystroke;
 * signing runs once.
 *
 * ── WHAT THESE CHECKS ARE, AND WHAT THEY ARE NOT ────────────────────────────
 * They check FORM, not existence and not checksum-with-certainty. A string that
 * passes here is well-shaped for that chain; it may still be an address nobody
 * holds. The purpose is to catch the mistake that actually happens — pasting a
 * TRON address into a Solana field, or an EVM address into a TON one — before
 * the user has typed an amount, rather than after they have signed.
 *
 * THE CROSS-VM CONFUSION IS THE REAL TARGET. All four alphabets overlap enough
 * that a wrong-chain paste looks fine to a person: a Solana pubkey and a TRON
 * address are both base58, and a TON raw address and an EVM address are both
 * hex. Getting it wrong sends funds to an address that exists on the wrong
 * network, which is unrecoverable.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import type { WalletVm } from "./types";

/** 20 bytes of hex. Case is not checked: EIP-55 is optional and both forms are valid. */
export const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/**
 * base58, 32–44 characters.
 *
 * Solana has no version byte and no checksum — a public key IS the address — so
 * length and alphabet are all there is to check. `0`, `O`, `I` and `l` are
 * excluded from base58 precisely because they are confusable.
 */
export const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** base58check beginning with T, always 34 characters. */
export const TRON_ADDRESS = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

/**
 * User-friendly ("UQ…"/"EQ…", and the testnet "kQ…"/"0Q…" forms) or raw
 * (`0:` followed by 64 hex characters).
 */
export const TON_ADDRESS = /^([UEkK0]Q[A-Za-z0-9_-]{46}|-?\d:[0-9a-fA-F]{64})$/;

/**
 * base58 decode, returning the byte length only.
 *
 * ── WHY THE REGEXES ABOVE ARE NOT ENOUGH, AND HOW THIS WAS FOUND ────────────
 * A TRON address is 34 base58 characters and a Solana address is "32-44" of the
 * same alphabet, so `SOLANA_ADDRESS.test("TUEZSdKs…")` is TRUE. The cross-chain
 * paste this module exists to catch was passing validation — caught by the
 * matrix test in `non-evm.test.ts`, not by reading the code.
 *
 * Decoding fixes it exactly: a Solana address is a 32-byte public key and a
 * TRON address is 21 bytes plus a 4-byte checksum. Those cannot be confused,
 * whatever their string lengths happen to be. Length alone also mis-rejects the
 * rare legitimate Solana key whose leading zero bytes shorten its encoding.
 */
function base58ByteLength(value: string): number | null {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = BigInt(0);
  for (const char of value) {
    const digit = ALPHABET.indexOf(char);
    if (digit < 0) return null;
    num = num * BigInt(58) + BigInt(digit);
  }

  let length = 0;
  while (num > BigInt(0)) {
    num >>= BigInt(8);
    length++;
  }
  // Leading '1's are leading zero bytes, which the bigint cannot represent.
  for (const char of value) {
    if (char === "1") length++;
    else break;
  }
  return length;
}

export function isValidAddressForVm(vm: WalletVm, value: string): boolean {
  const address = String(value ?? "").trim();
  switch (vm) {
    case "EVM":
      return EVM_ADDRESS.test(address);
    case "SOLANA":
      // 32-byte public key. The regex is the cheap pre-filter; the decode is
      // what actually distinguishes it from a TRON address.
      return SOLANA_ADDRESS.test(address) && base58ByteLength(address) === 32;
    case "TRON":
      // 21-byte payload (0x41 ‖ 20) plus a 4-byte checksum.
      return TRON_ADDRESS.test(address) && base58ByteLength(address) === 25;
    case "TON":
      return TON_ADDRESS.test(address);
    default:
      return false;
  }
}

/**
 * Which VM does this address look like it belongs to?
 *
 * USED ONLY TO IMPROVE AN ERROR MESSAGE. "That is a TRON address; you are
 * sending on Solana" is actionable, where "invalid address" leaves someone
 * staring at a string that looks perfectly fine to them.
 *
 * Order matters: TRON's pattern is a strict subset of Solana's alphabet, so it
 * is tested first. A 34-character base58 string starting with T is far more
 * likely to be a TRON address than a Solana one, and saying so is the useful
 * guess even though it is a guess.
 */
export function guessVm(value: string): WalletVm | null {
  const address = String(value ?? "").trim();
  if (isValidAddressForVm("EVM", address)) return "EVM";
  if (isValidAddressForVm("TON", address)) return "TON";
  if (isValidAddressForVm("TRON", address)) return "TRON";
  if (isValidAddressForVm("SOLANA", address)) return "SOLANA";
  return null;
}
