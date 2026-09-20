/**
 * The in-house wallet, speaking the Wallet Standard.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * SOLANA'S EQUIVALENT OF EIP-6963, AND IT IS SAFE FOR THE SAME REASON.
 *
 * `config/wallet.tsx` already documents the mechanism: the Solana adapter is
 * constructed with `wallets: []` precisely so it DISCOVERS wallets through
 * `@wallet-standard/app` rather than using a hardcoded list. Registering here
 * therefore puts the in-house wallet in the same chooser as Phantom, Solflare
 * and Backpack, with no change to the swap terminal.
 *
 * Crucially it is a REGISTRY, not a global. Registering adds an entry; it
 * cannot overwrite Phantom the way writing to `window.solana` would. That is
 * the same property EIP-6963 gives on the EVM side, and the reason both are
 * used in preference to the older global-injection pattern.
 *
 * ── THE HANDSHAKE HAS TWO HALVES, AND BOTH ARE REQUIRED ─────────────────────
 * A wallet that loaded first dispatches `wallet-standard:register-wallet` and
 * hopes someone is listening. An app that loaded first dispatches
 * `wallet-standard:app-ready` carrying its registry. Implementing only the
 * first makes the wallet invisible to any page that mounted late — which, in a
 * Next.js app with a lazily-mounted wallet provider, is most of them.
 *
 * ── EVERY SIGNATURE STILL GOES THROUGH THE APPROVAL QUEUE ───────────────────
 * `signAndSendTransaction` here does not reach a key directly; it asks, exactly
 * as the EIP-1193 provider does. A dapp cannot tell the difference, and a user
 * gets the same review sheet whichever chain they are on.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { RPC_ERROR, WalletRpcError, requestApproval } from "../approval";
import { ensureUnlocked } from "../gate";
import { addressFor, getSnapshot, subscribe } from "../session";
import { chainIdForVm } from "../non-evm-chains";

/** Solana mainnet, in the Wallet Standard's CAIP-ish notation. */
const SOLANA_MAINNET = "solana:mainnet";

const WALLET_VERSION = "1.0.0";

type Listener = (...args: unknown[]) => void;

/**
 * The icon, inlined. Same mark as the EIP-6963 announcement, so a user who has
 * seen the wallet in one chooser recognises it in the other.
 */
const ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">' +
      '<rect width="96" height="96" rx="22" fill="url(#g)"/>' +
      '<path d="M24 34a8 8 0 0 1 8-8h30a6 6 0 0 1 0 12H34a2 2 0 0 0 0 4h34a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8V34Z" fill="#fff" fill-opacity=".95"/>' +
      '<circle cx="64" cy="59" r="5" fill="url(#g)"/>' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">' +
      '<stop stop-color="#6366F1"/><stop offset=".5" stop-color="#8B5CF6"/><stop offset="1" stop-color="#EC4899"/>' +
      "</linearGradient></defs></svg>"
  );

function walletName(): string {
  const site = (process.env.NEXT_PUBLIC_SITE_NAME ?? "").trim();
  return site ? `${site} Wallet` : "Platform Wallet";
}

/** base58 encode, for the account address. No dependency needed for 32 bytes. */
function base58(bytes: Uint8Array): string {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = BigInt(0);
  for (const byte of bytes) num = (num << BigInt(8)) | BigInt(byte);
  let out = "";
  while (num > BigInt(0)) {
    out = ALPHABET[Number(num % BigInt(58))] + out;
    num /= BigInt(58);
  }
  for (const byte of bytes) {
    if (byte === 0) out = "1" + out;
    else break;
  }
  return out;
}

function decodeBase58(value: string): Uint8Array {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = BigInt(0);
  for (const char of value) num = num * BigInt(58) + BigInt(ALPHABET.indexOf(char));
  const bytes: number[] = [];
  while (num > BigInt(0)) {
    bytes.unshift(Number(num & BigInt(0xff)));
    num >>= BigInt(8);
  }
  for (const char of value) {
    if (char === "1") bytes.unshift(0);
    else break;
  }
  return new Uint8Array(bytes);
}

/**
 * The two transaction shapes `@solana/web3.js` produces, reduced to what this
 * adapter touches. Declared structurally because the module is imported
 * dynamically — it is heavy and only needed on a signature — so there is no
 * static import to hang the real classes off.
 *
 * `sign` is varargs on purpose: `VersionedTransaction` takes a signer ARRAY and
 * the legacy `Transaction` takes them as separate arguments. Getting that wrong
 * throws deep inside web3.js with a message about an unsupported version that
 * reads like corruption, which is why the caller branches on `version`.
 */
interface SignableTransaction {
  version?: unknown;
  sign(...signers: unknown[]): void;
  serialize(): Uint8Array;
}

/** One Wallet Standard transaction input. Only the first is ever honoured. */
interface SolanaTransactionInput {
  transaction: Uint8Array;
}

/** One Wallet Standard message input. */
interface SolanaMessageInput {
  message: Uint8Array;
}

class PlatformSolanaWallet {
  readonly version = WALLET_VERSION;
  readonly name = walletName();
  readonly icon = ICON as `data:image/svg+xml,${string}`;
  readonly chains = [SOLANA_MAINNET] as const;

  private readonly listeners = new Map<string, Set<Listener>>();
  private connected = false;

  constructor() {
    /*
      An account that appears or disappears — sign-in, sign-out, a restore in
      another tab — is a `change` event to any connected dapp. Without it, a
      terminal keeps showing an address the wallet no longer has.
    */
    subscribe(() => {
      if (!this.connected) return;
      if (!getSnapshot().vault) this.connected = false;
      this.emit("change", { accounts: this.accounts });
    });
  }

  get accounts() {
    if (!this.connected) return [];
    const address = addressFor("SOLANA");
    if (!address) return [];
    return [
      {
        address,
        publicKey: decodeBase58(address),
        chains: this.chains,
        features: [
          "solana:signAndSendTransaction",
          "solana:signTransaction",
          "solana:signMessage",
        ],
        label: this.name,
        icon: this.icon,
      },
    ];
  }

  get features() {
    return {
      "standard:connect": {
        version: "1.0.0",
        connect: this.connect.bind(this),
      },
      "standard:disconnect": {
        version: "1.0.0",
        disconnect: this.disconnect.bind(this),
      },
      "standard:events": {
        version: "1.0.0",
        on: this.on.bind(this),
      },
      "solana:signAndSendTransaction": {
        version: "1.0.0",
        /*
          BOTH TRANSACTION VERSIONS. Legacy AND v0 — a multi-hop aggregator
          route names more accounts than a legacy transaction can hold, so a
          wallet that advertised legacy only would silently cost the user the
          better routes. The terminal's own Solana path already asks for v0 and
          says exactly this.
        */
        supportedTransactionVersions: ["legacy", 0],
        signAndSendTransaction: this.signAndSendTransaction.bind(this),
      },
      "solana:signTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signTransaction: this.signTransaction.bind(this),
      },
      "solana:signMessage": {
        version: "1.0.0",
        signMessage: this.signMessage.bind(this),
      },
    };
  }

  /* ── connection ─────────────────────────────────────────────────────────── */

  private async connect() {
    if (getSnapshot().state === "absent") {
      throw new WalletRpcError(
        RPC_ERROR.UNAUTHORIZED,
        "You have not created a wallet on this account yet."
      );
    }
    if (!this.connected) {
      await requestApproval({
        kind: "connect",
        origin: globalThis.location?.origin ?? "",
        chainId: chainIdForVm("SOLANA"),
      });
      this.connected = true;
    }
    this.emit("change", { accounts: this.accounts });
    return { accounts: this.accounts };
  }

  private async disconnect() {
    this.connected = false;
    this.emit("change", { accounts: [] });
  }

  private on(event: string, listener: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  private emit(event: string, ...args: unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      try {
        listener(...args);
      } catch {
        /* A dapp listener that throws must not abort the remaining ones. */
      }
    }
  }

  /* ── signing ────────────────────────────────────────────────────────────── */

  private requireAddress(): string {
    const address = addressFor("SOLANA");
    if (!address) {
      throw new WalletRpcError(
        RPC_ERROR.UNAUTHORIZED,
        "No Solana account is available on this wallet."
      );
    }
    return address;
  }

  /**
   * Sign, and broadcast.
   *
   * The Wallet Standard passes ONE OR MORE inputs and expects one output per
   * input. Only the first is honoured here: nothing in this product batches,
   * and silently signing a second transaction a caller did not expect us to
   * handle is worse than the caller noticing one came back.
   */
  private async signAndSendTransaction(...inputs: SolanaTransactionInput[]) {
    const input = inputs[0];
    const address = this.requireAddress();
    await ensureUnlocked("sign");

    const { VersionedTransaction, Transaction, Connection } = await import(
      "@solana/web3.js"
    );
    const { rpcUrlFor } = await import("../non-evm-chains");
    const chainId = chainIdForVm("SOLANA");

    const bytes: Uint8Array = input.transaction;
    let transaction: SignableTransaction;
    try {
      transaction = VersionedTransaction.deserialize(bytes);
    } catch {
      transaction = Transaction.from(bytes);
    }

    await requestApproval({
      kind: "sendTransaction",
      vm: "SOLANA",
      chainId,
      address,
      /*
        Rendered by the review sheet's EVM branch as an undecodable payload,
        which is the honest presentation: nobody here has read the aggregator's
        instructions, and claiming otherwise is what teaches people to click
        through. The `data` carries the serialised transaction so the sheet can
        at least show its size and let the user expand it.
      */
      transaction: { from: address, data: `0x${toHex(bytes)}` },
    });

    const signed = await this.signLocally(transaction);
    const connection = new Connection(rpcUrlFor(chainId), "confirmed");
    const signature = await connection.sendRawTransaction(signed.serialize());

    return [{ signature: decodeBase58(signature) }];
  }

  private async signTransaction(...inputs: SolanaTransactionInput[]) {
    const input = inputs[0];
    const address = this.requireAddress();
    await ensureUnlocked("sign");

    const { VersionedTransaction, Transaction } = await import("@solana/web3.js");
    const bytes: Uint8Array = input.transaction;

    await requestApproval({
      kind: "sendTransaction",
      vm: "SOLANA",
      chainId: chainIdForVm("SOLANA"),
      address,
      transaction: { from: address, data: `0x${toHex(bytes)}` },
    });

    let transaction: SignableTransaction;
    try {
      transaction = VersionedTransaction.deserialize(bytes);
    } catch {
      transaction = Transaction.from(bytes);
    }
    const signed = await this.signLocally(transaction);
    return [{ signedTransaction: signed.serialize() }];
  }

  private async signMessage(...inputs: SolanaMessageInput[]) {
    const input = inputs[0];
    const address = this.requireAddress();
    await ensureUnlocked("sign");

    const message: Uint8Array = input.message;
    await requestApproval({
      kind: "signMessage",
      vm: "SOLANA",
      address,
      message: new TextDecoder().decode(message),
    });

    const { signEd25519 } = await import("../signers/ed25519");
    return [{ signedMessage: message, signature: signEd25519("SOLANA", message) }];
  }

  /**
   * Apply the wallet's signature to an already-built transaction.
   *
   * `VersionedTransaction` takes a signer array; the legacy `Transaction`
   * takes varargs. Getting that wrong throws deep inside web3.js with a message
   * about an unsupported version that reads like corruption.
   */
  private async signLocally(transaction: SignableTransaction) {
    const { Keypair } = await import("@solana/web3.js");
    const { derivePrivateKey } = await import("../derive");
    const { requireSeed } = await import("../session");

    const keypair = Keypair.fromSeed(derivePrivateKey(requireSeed(), "SOLANA", 0));
    if (typeof transaction.sign === "function" && transaction.version !== undefined) {
      transaction.sign([keypair]);
    } else {
      transaction.sign(keypair);
    }
    return transaction;
  }
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

/* ── registration ─────────────────────────────────────────────────────────── */

let registered = false;

/**
 * Register, and keep answering.
 *
 * IDEMPOTENT, because React 18's StrictMode mounts effects twice in development
 * and a second registration shows the wallet twice in the chooser — only in
 * dev, which is the worst place to first notice it.
 */
export function registerSolanaWallet(): void {
  if (registered || typeof window === "undefined") return;
  registered = true;

  const wallet = new PlatformSolanaWallet();
  const register = (api: { register?: (w: unknown) => void } | null) => {
    try {
      api?.register?.(wallet);
    } catch {
      /* A registry that refuses is a registry we are not in. Nothing to do. */
    }
  };

  // Half two: answer an app that mounts later.
  window.addEventListener("wallet-standard:app-ready", ((event: CustomEvent) => {
    register(event.detail);
  }) as EventListener);

  // Half one: tell any registry already listening.
  window.dispatchEvent(
    new CustomEvent("wallet-standard:register-wallet", {
      detail: register,
    })
  );
}
