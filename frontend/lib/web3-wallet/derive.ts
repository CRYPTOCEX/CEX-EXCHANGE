/**
 * One recovery phrase -> addresses on all four VMs the addon trades on.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * READ THIS BEFORE CHANGING A CONSTANT IN THIS FILE.
 *
 * The paths below are not ours to choose. They are the paths Phantom, Tonkeeper
 * and TronLink use, and matching them is what makes the recovery phrase we hand
 * a user actually worth having: they can type it into any of those wallets and
 * find their money exactly where this product said it was. A path we invented
 * would still be a working wallet — and a wallet nobody but us can open, which
 * is a custodial product with extra steps.
 *
 * Changing a path, a curve, a prefix or the TON contract version does not break
 * a test. It silently relocates every existing user's funds to an address
 * nothing in the product points at any more, with no error anywhere. The frozen
 * vectors in `e2e/unit/frontend/lib/web3-wallet/derive.test.ts` exist to make
 * that impossible to do by accident, and they were produced by FOUR INDEPENDENT
 * implementations (`viem`, `ed25519-hd-key` + `@solana/web3.js`, `@ton/ton`,
 * `tronweb`) rather than by this file.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { HDKey } from "@scure/bip32";
import { ed25519 } from "@noble/curves/ed25519";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";
import { sha256 } from "@noble/hashes/sha2";
import { base58, base58check } from "@scure/base";

import { derivePathEd25519 } from "./slip10";
import { tonV4R2Address } from "./ton-address";
import {
  WalletError,
  type DerivedAccount,
  type DerivedWallet,
  type WalletVm,
} from "./types";

/* ── paths ────────────────────────────────────────────────────────────────── */

/**
 * SLIP-44 coin types: 60 = Ethereum, 501 = Solana, 607 = TON, 195 = TRON.
 *
 * Note the SHAPES differ per VM and that is not an inconsistency to tidy up:
 *   - EVM and TRON vary the ADDRESS INDEX (the last segment), which is what
 *     MetaMask and TronLink do when you press "add account";
 *   - Solana varies the ACCOUNT segment, which is what Phantom does;
 *   - TON has three segments, which is what Tonkeeper does.
 * Normalising them would break compatibility with the wallet each one mirrors,
 * which is the only reason the paths are here at all.
 */
export const DERIVATION_PATHS = {
  EVM: (index: number) => `m/44'/60'/0'/0/${index}`,
  SOLANA: (index: number) => `m/44'/501'/${index}'/0'`,
  TON: (index: number) => `m/44'/607'/${index}'`,
  TRON: (index: number) => `m/44'/195'/0'/0/${index}`,
} as const satisfies Record<WalletVm, (index: number) => string>;

/* ── EVM ──────────────────────────────────────────────────────────────────── */

/**
 * secp256k1 -> keccak256 of the uncompressed public key minus its 0x04 tag ->
 * last 20 bytes -> EIP-55 checksum.
 *
 * THE `.slice(1)` IS THE STEP EVERY HAND-ROLLED IMPLEMENTATION GETS WRONG.
 * `getPublicKey(priv, false)` returns 65 bytes whose first is the constant 0x04
 * saying "uncompressed"; the address is the hash of the 64 bytes AFTER it.
 * Hashing all 65 produces a valid-looking address that belongs to nobody.
 */
function evmAddressFromPrivateKey(privateKey: Uint8Array): string {
  const publicKey = secp256k1.getPublicKey(privateKey, false);
  const hashed = keccak_256(publicKey.slice(1));
  return toChecksumAddress(bytesToHex(hashed.slice(-20)));
}

/**
 * EIP-55: uppercase a hex digit when the corresponding nibble of
 * `keccak256(lowercase_address_without_0x)` is >= 8.
 *
 * Kept rather than imported so this module stays free of viem — the provider
 * layer needs viem for SIGNING, but derivation runs in the unit suite and in
 * the vault path, and neither should pull a 300 kB EVM client to capitalise
 * forty characters.
 */
function toChecksumAddress(lowerHexNo0x: string): string {
  const hash = bytesToHex(keccak_256(new TextEncoder().encode(lowerHexNo0x)));
  let out = "0x";
  for (let i = 0; i < lowerHexNo0x.length; i++) {
    const c = lowerHexNo0x[i];
    out += Number.parseInt(hash[i], 16) >= 8 ? c.toUpperCase() : c;
  }
  return out;
}

/* ── TRON ─────────────────────────────────────────────────────────────────── */

/**
 * TRON is EVM's address derivation with two changes: a 0x41 version byte in
 * front, and base58check instead of hex. `@scure/base`'s `base58check` takes
 * the hash function and applies it TWICE internally, which is what TRON (and
 * Bitcoin) specify — passing a single-sha256 helper here would produce
 * addresses that every TRON node rejects.
 */
const tronBase58Check = base58check(sha256);

function tronAddressFromPrivateKey(privateKey: Uint8Array): string {
  const publicKey = secp256k1.getPublicKey(privateKey, false);
  const hashed = keccak_256(publicKey.slice(1));
  const raw = new Uint8Array(21);
  raw[0] = 0x41;
  raw.set(hashed.slice(-20), 1);
  return tronBase58Check.encode(raw);
}

/* ── TON ──────────────────────────────────────────────────────────────────── */

/**
 * TON's address lives in `./ton-address`, which computes it from the cell
 * representation hash rather than through `@ton/core`. That file states why —
 * briefly, `@ton/core` needs a `Buffer` global this frontend does not have, and
 * pulling it in dynamically would have made all four derivations async to serve
 * one of them.
 *
 * WHY V4R2 AND NOT W5. W5 is newer and is Tonkeeper's current default. V4R2 has
 * universal explorer, bridge and tooling support, and — the deciding argument —
 * a TON address is the hash of the contract's CODE, so the same phrase yields a
 * different address under each version. Picking the one every tool can already
 * see is what keeps the phrase portable today; `contractVersion` is recorded on
 * every account so a later migration can offer both without having to guess
 * which address an existing user's funds are sitting behind.
 */

/* ── private keys ─────────────────────────────────────────────────────────── */

/**
 * The signing key for one VM at one index.
 *
 * DELIBERATELY SEPARATE FROM {@link deriveWallet}, and never reachable from a
 * {@link DerivedAccount}. Address derivation is called on every unlock and its
 * result is written to the server; this is called once per signature and its
 * result never leaves the call stack. Keeping them in one function would have
 * put a private key on the object that gets serialised into the vault envelope.
 *
 * For ed25519 VMs the returned 32 bytes are the SEED, not an expanded keypair —
 * which is what `ed25519.sign` and every TON/Solana signer expects.
 */
export function derivePrivateKey(
  seed: Uint8Array,
  vm: WalletVm,
  index = 0
): Uint8Array {
  assertIndex(index);
  switch (vm) {
    case "EVM":
    case "TRON": {
      const node = HDKey.fromMasterSeed(seed).derive(DERIVATION_PATHS[vm](index));
      if (!node.privateKey) {
        // Unreachable from a master seed, but a null here would otherwise be
        // signed with as `undefined` and produce a garbage signature.
        throw new WalletError("CORRUPT", `No private key at ${vm} index ${index}`);
      }
      return node.privateKey;
    }
    case "SOLANA":
    case "TON":
      return derivePathEd25519(seed, DERIVATION_PATHS[vm](index)).key;
    default:
      throw new WalletError("UNSUPPORTED", `Unknown VM: ${String(vm)}`);
  }
}

/** The public key for one VM at one index, hex without `0x`. */
export function derivePublicKeyHex(
  seed: Uint8Array,
  vm: WalletVm,
  index = 0
): string {
  const priv = derivePrivateKey(seed, vm, index);
  switch (vm) {
    case "EVM":
    case "TRON":
      // Compressed: 33 bytes. The uncompressed form is only needed to compute
      // an address, and is recomputed there rather than stored.
      return bytesToHex(secp256k1.getPublicKey(priv, true));
    case "SOLANA":
    case "TON":
      return bytesToHex(ed25519.getPublicKey(priv));
    default:
      throw new WalletError("UNSUPPORTED", `Unknown VM: ${String(vm)}`);
  }
}

/* ── the whole set ────────────────────────────────────────────────────────── */

/**
 * Every VM, one account index.
 *
 * SYNCHRONOUS, which is worth stating because it very nearly was not: the first
 * cut reached for `@ton/core` and had to dynamically import it, which made the
 * TON address a promise and therefore made this function — and every caller,
 * up to and including the unlock screen — async for one sha256. See
 * `./ton-address`.
 */
export function deriveWallet(seed: Uint8Array, index = 0): DerivedWallet {
  assertIndex(index);

  const evmKey = derivePrivateKey(seed, "EVM", index);
  const tronKey = derivePrivateKey(seed, "TRON", index);
  const solKey = derivePrivateKey(seed, "SOLANA", index);
  const tonKey = derivePrivateKey(seed, "TON", index);
  const tonPub = ed25519.getPublicKey(tonKey);

  const accounts: DerivedAccount[] = [
    {
      vm: "EVM",
      index,
      path: DERIVATION_PATHS.EVM(index),
      address: evmAddressFromPrivateKey(evmKey),
      publicKey: bytesToHex(secp256k1.getPublicKey(evmKey, true)),
    },
    {
      vm: "SOLANA",
      index,
      path: DERIVATION_PATHS.SOLANA(index),
      address: base58.encode(ed25519.getPublicKey(solKey)),
      publicKey: bytesToHex(ed25519.getPublicKey(solKey)),
    },
    {
      vm: "TON",
      index,
      path: DERIVATION_PATHS.TON(index),
      address: tonV4R2Address(tonPub),
      publicKey: bytesToHex(tonPub),
      contractVersion: "v4r2",
    },
    {
      vm: "TRON",
      index,
      path: DERIVATION_PATHS.TRON(index),
      address: tronAddressFromPrivateKey(tronKey),
      publicKey: bytesToHex(secp256k1.getPublicKey(tronKey, true)),
    },
  ];

  return { index, accounts };
}

/** Indices 0..count-1, flattened. Used when restoring a vault that had several. */
export function deriveWallets(
  seed: Uint8Array,
  count: number
): DerivedAccount[] {
  return Array.from({ length: Math.max(1, count) }, (_, i) =>
    deriveWallet(seed, i)
  ).flatMap((w) => w.accounts);
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

function assertIndex(index: number): void {
  // 2^31 is BIP-32's hardened boundary; anything near it is a bug upstream, and
  // a non-integer silently truncates inside the path string template.
  if (!Number.isInteger(index) || index < 0 || index >= 0x80000000) {
    throw new WalletError("UNSUPPORTED", `Invalid account index: ${index}`);
  }
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}
