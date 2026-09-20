/**
 * BIP-39 recovery phrases — generation, normalisation and validation.
 *
 * Thin over `@scure/bip39`, and the thinness is deliberate: the parts that are
 * ours are the ones this file exists for — the normalisation a human's typing
 * needs, and refusing to guess when a phrase is nearly right.
 */

import {
  generateMnemonic as scureGenerate,
  mnemonicToSeedSync as scureToSeed,
  validateMnemonic as scureValidate,
} from "@scure/bip39";
import { wordlist as english } from "@scure/bip39/wordlists/english";

import { WalletError, type MnemonicStrength } from "./types";

/**
 * 12 words = 128 bits, 24 = 256.
 *
 * 12 IS THE DEFAULT AND THAT IS NOT A SECURITY COMPROMISE. 128 bits of entropy
 * is not brute-forceable and never will be; the honest difference between 12
 * and 24 words is how many words a person has to write down correctly, and a
 * 24-word phrase that gets photographed because it was tedious to copy is
 * strictly worse than a 12-word one on paper. 24 is offered because some users
 * arrive with a policy that says so.
 */
const STRENGTH_BITS: Record<MnemonicStrength, number> = { 12: 128, 24: 256 };

/** A fresh phrase from the platform CSPRNG. */
export function generateMnemonic(strength: MnemonicStrength = 12): string {
  /*
    `@scure/bip39` draws from `@noble/hashes`'s `randomBytes`, which is
    `crypto.getRandomValues` in a browser and `node:crypto` under the test
    runner. There is no Math.random fallback in that chain — it throws instead —
    which is the property that matters and the reason nothing here reimplements
    entropy collection.
  */
  return scureGenerate(english, STRENGTH_BITS[strength]);
}

/**
 * What a human typed -> what BIP-39 can check.
 *
 * FOUR NORMALISATIONS, EACH FOR AN OBSERVED WAY PHRASES ARRIVE:
 *   - NFKD, because a phrase pasted from a PDF or a phone note can carry
 *     precomposed forms that are a different byte string for the same letters,
 *     and BIP-39 specifies NFKD;
 *   - lowercase, because iOS autocapitalises the first word of every field;
 *   - collapse ALL whitespace runs, because copying from a printed grid brings
 *     newlines and double spaces;
 *   - trim, for the trailing space a tap-to-paste leaves behind.
 *
 * It does NOT fix spelling, expand abbreviations, or reorder. A phrase that is
 * wrong stays wrong — see {@link validateMnemonic}.
 */
export function normaliseMnemonic(input: string): string {
  return String(input ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Is this a valid BIP-39 phrase, checksum included?
 *
 * THE CHECKSUM IS THE POINT. Twelve words that are all in the wordlist are not
 * a valid phrase — the last word encodes a checksum over the entropy, so a
 * single mistyped word is caught here rather than at "why is my wallet empty?".
 * That is the entire reason import validates before it derives.
 */
export function validateMnemonic(mnemonic: string): boolean {
  try {
    return scureValidate(normaliseMnemonic(mnemonic), english);
  } catch {
    return false;
  }
}

/**
 * Words that are not in the English BIP-39 list, in order of appearance.
 *
 * Returned so the import screen can underline the offending word instead of
 * saying "invalid phrase" about twelve words of which eleven are right. An
 * empty array with `validateMnemonic() === false` means every word is real and
 * the CHECKSUM failed — which is usually two words swapped, and the copy says
 * so.
 */
export function unknownWords(mnemonic: string): string[] {
  const words = normaliseMnemonic(mnemonic).split(" ").filter(Boolean);
  const known = new Set(english);
  return words.filter((w) => !known.has(w));
}

/**
 * Phrase (+ optional passphrase) -> the 64-byte seed everything derives from.
 *
 * @throws {WalletError} `BAD_MNEMONIC` — never derives from an invalid phrase.
 *
 * REFUSING IS THE WHOLE JOB. BIP-39's seed function is a PBKDF2 over the
 * phrase's TEXT: it happily produces 64 perfectly good bytes for a phrase with
 * a typo in it, and those bytes are a real wallet at a real address that the
 * user will never be able to reach again. Every wallet that has ever lost
 * someone's money to a typo did so by skipping this check.
 */
export function mnemonicToSeed(mnemonic: string, passphrase = ""): Uint8Array {
  const normalised = normaliseMnemonic(mnemonic);
  if (!scureValidate(normalised, english)) {
    throw new WalletError(
      "BAD_MNEMONIC",
      "That recovery phrase is not valid. Check for a mistyped or swapped word."
    );
  }
  // The passphrase is NOT lowercased or whitespace-collapsed: unlike the
  // phrase it is a secret chosen by the user, where case and spacing are
  // meaningful. BIP-39 applies NFKD to it, which @scure does internally.
  return scureToSeed(normalised, passphrase);
}

/** 12 or 24, or null when the phrase is neither length. */
export function mnemonicStrength(mnemonic: string): MnemonicStrength | null {
  const n = normaliseMnemonic(mnemonic).split(" ").filter(Boolean).length;
  return n === 12 || n === 24 ? (n as MnemonicStrength) : null;
}

/** The English BIP-39 wordlist, for the import screen's autocomplete. */
export const ENGLISH_WORDLIST: readonly string[] = english;
