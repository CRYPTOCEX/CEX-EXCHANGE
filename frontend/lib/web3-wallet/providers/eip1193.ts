/**
 * The in-house wallet, speaking EIP-1193.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS, AND WHY IT IS THE CHEAPEST POSSIBLE INTEGRATION.
 *
 * The swap terminal, SIWE login, the profile wallet tab and four NFT flows all
 * reach a wallet through wagmi, and wagmi reaches a wallet through an EIP-1193
 * provider it discovered. So the in-house wallet does not need a branch in any
 * of those surfaces — it needs to BE one of those providers. Announce it
 * (EIP-6963, see `./announce.ts`), and the existing code cannot tell it from
 * MetaMask.
 *
 * The alternative — a `useDexWallet` branch per surface — was four places to
 * keep in step, each of which would silently rot the first time somebody added
 * a fifth surface. This is one seam that cannot rot, because the moment it
 * stops behaving like a provider, every surface breaks at once and loudly.
 *
 * ── TWO DELIBERATE DEPARTURES FROM METAMASK ─────────────────────────────────
 *
 * 1. LOCKING DOES NOT DISCONNECT. MetaMask emits `accountsChanged([])` when it
 *    locks, which makes every connected site show a Connect button. For an
 *    in-page wallet with a 15-minute idle timer that is hostile: a user who
 *    reads a chart for a quarter of an hour would come back to a terminal that
 *    had forgotten them. Here the account stays visible while locked and the
 *    UNLOCK IS DEMANDED AT SIGNING TIME, which is what Phantom does and what
 *    the approval queue is shaped for. Nothing can be signed while locked —
 *    `requireSeed()` is the only door and it is shut.
 *
 * 2. `eth_sign` IS REFUSED OUTRIGHT. It signs 32 arbitrary bytes with no
 *    prefix, which means those bytes can be the hash of a transaction. Every
 *    major wallet has removed or hard-gated it. There is no legitimate caller
 *    in this product and there will not be one.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import {
  DEFAULT_EVM_CHAIN_ID,
  evmChain,
  isEvmChainId,
  parseChainId,
  toHexChainId,
} from "../chains";
import {
  RPC_ERROR,
  WalletRpcError,
  requestApproval,
  type EvmTransactionRequest,
} from "../approval";
import { ensureUnlocked } from "../gate";
import { addressFor, getSnapshot, subscribe } from "../session";
import {
  evmPublicClient,
  sendEvmTransaction,
  signEvmMessage,
  signEvmTypedData,
} from "../signers/evm";

type Handler = (...args: unknown[]) => void;

export interface RequestArguments {
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

/**
 * Whether the page has been granted account access, across reloads.
 *
 * localStorage rather than session state, because wagmi's autoconnect runs
 * before React mounts and asks `eth_accounts` — a wallet that answered `[]`
 * there would drop its connection on every refresh, which is exactly the bug
 * `config/wallet.tsx` documents at length for the wagmi storage filter.
 *
 * IT IS NOT A SECURITY BOUNDARY. It records "this browser has connected
 * before", nothing more; every signature still goes through the approval
 * queue. A user who clears it simply sees the connect prompt again.
 */
const CONNECTED_KEY = "web3-wallet:connected";

function readConnected(): boolean {
  try {
    return globalThis.localStorage?.getItem(CONNECTED_KEY) === "1";
  } catch {
    // Private mode, or storage disabled. Treat as not connected rather than
    // throwing inside a provider call that has no way to report it.
    return false;
  }
}

function writeConnected(value: boolean): void {
  try {
    if (value) globalThis.localStorage?.setItem(CONNECTED_KEY, "1");
    else globalThis.localStorage?.removeItem(CONNECTED_KEY);
  } catch {
    /* nothing to do; the wallet still works for this page load */
  }
}

export class PlatformWalletProvider {
  /** Discoverability flags. `isMetaMask` is deliberately NOT among them. */
  readonly isPlatformWallet = true;

  private chainId: number = DEFAULT_EVM_CHAIN_ID;
  private connected = false;
  private readonly listeners = new Map<string, Set<Handler>>();

  constructor() {
    this.connected = readConnected();

    /*
      A vault that appears (sign-in, or a restore on another tab) makes an
      already-authorised page connected. Without this, a user who signs in and
      lands straight on the terminal sees a Connect button for a wallet the page
      already has.
    */
    subscribe(() => {
      const address = addressFor("EVM");
      if (address && this.connected) this.emit("accountsChanged", [address]);
      if (!getSnapshot().vault && this.connected) this.disconnectInternal();
    });
  }

  /* ── EIP-1193 surface ───────────────────────────────────────────────────── */

  async request(args: RequestArguments): Promise<unknown> {
    const method = String(args?.method ?? "");
    const params = (Array.isArray(args?.params) ? args.params : []) as unknown[];

    switch (method) {
      case "eth_requestAccounts":
        return this.connect();

      case "eth_accounts":
        // MUST NOT PROMPT. The spec's read-only twin of the above; wagmi calls
        // it on every page load to decide whether to restore a session.
        return this.accounts();

      case "eth_chainId":
        return toHexChainId(this.chainId);

      case "net_version":
        return String(this.chainId);

      case "wallet_switchEthereumChain":
        return this.switchChain(params[0]);

      case "wallet_addEthereumChain":
        // The chain set is fixed at build time. If the caller is asking for one
        // we already have, that is a success; anything else is 4902 and the
        // dapp's own "unsupported network" copy is the right thing to show.
        return this.assertKnownChain(params[0]);

      case "personal_sign":
        return this.personalSign(params);

      case "eth_signTypedData_v4":
      case "eth_signTypedData":
        return this.signTypedData(params);

      case "eth_sendTransaction":
        return this.sendTransaction(params[0] as EvmTransactionRequest);

      case "eth_sign":
        // See the header. Not a capability gap — a removed footgun.
        throw new WalletRpcError(
          RPC_ERROR.UNSUPPORTED_METHOD,
          "eth_sign is unsafe and is not supported. Use personal_sign."
        );

      case "eth_signTransaction":
        throw new WalletRpcError(
          RPC_ERROR.UNSUPPORTED_METHOD,
          "This wallet signs and broadcasts in one step. Use eth_sendTransaction."
        );

      default:
        return this.forward(method, params);
    }
  }

  on(event: string, handler: Handler): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return this;
  }

  removeListener(event: string, handler: Handler): this {
    this.listeners.get(event)?.delete(handler);
    return this;
  }

  /** wagmi's connectors call both spellings depending on version. */
  off(event: string, handler: Handler): this {
    return this.removeListener(event, handler);
  }

  private emit(event: string, ...args: unknown[]): void {
    for (const handler of this.listeners.get(event) ?? []) {
      try {
        handler(...args);
      } catch {
        /*
          A listener that throws is the DAPP's bug, and letting it escape here
          would abort the remaining listeners — so one broken subscriber would
          stop wagmi ever hearing about a chain change. Swallowed on purpose.
        */
      }
    }
  }

  /* ── connection ─────────────────────────────────────────────────────────── */

  private accounts(): string[] {
    if (!this.connected) return [];
    const address = addressFor("EVM");
    return address ? [address] : [];
  }

  private async connect(): Promise<string[]> {
    const snapshot = getSnapshot();

    if (snapshot.state === "absent") {
      throw new WalletRpcError(
        RPC_ERROR.UNAUTHORIZED,
        "You have not created a wallet on this account yet."
      );
    }

    if (!this.connected) {
      await requestApproval({
        kind: "connect",
        origin: globalThis.location?.origin ?? "",
        chainId: this.chainId,
      });
      this.connected = true;
      writeConnected(true);
    }

    const accounts = this.accounts();
    this.emit("connect", { chainId: toHexChainId(this.chainId) });
    this.emit("accountsChanged", accounts);
    return accounts;
  }

  /** Called by the UI's "disconnect", and when the vault goes away. */
  disconnect(): void {
    this.disconnectInternal();
  }

  private disconnectInternal(): void {
    this.connected = false;
    writeConnected(false);
    this.emit("accountsChanged", []);
    this.emit("disconnect", new WalletRpcError(RPC_ERROR.DISCONNECTED, "Disconnected."));
  }

  /* ── chain ──────────────────────────────────────────────────────────────── */

  private assertKnownChain(param: unknown): null {
    const chainId = parseChainId((param as { chainId?: unknown })?.chainId);
    if (chainId === null || !isEvmChainId(chainId)) {
      throw new WalletRpcError(
        RPC_ERROR.UNRECOGNIZED_CHAIN,
        "This wallet does not support that network."
      );
    }
    return null;
  }

  private async switchChain(param: unknown): Promise<null> {
    const chainId = parseChainId((param as { chainId?: unknown })?.chainId);
    if (chainId === null) {
      throw new WalletRpcError(RPC_ERROR.INVALID_PARAMS, "No chain id given.");
    }
    if (!isEvmChainId(chainId)) {
      throw new WalletRpcError(
        RPC_ERROR.UNRECOGNIZED_CHAIN,
        `This wallet does not support chain ${chainId}.`
      );
    }
    if (chainId === this.chainId) return null;

    /*
      NO PROMPT FOR A CHAIN SWITCH, and that is a considered choice rather than
      a shortcut. Switching networks moves no money and grants no access — the
      dangerous operation is the transaction that follows, and that one IS
      prompted, on a sheet that names the network it will be broadcast to. A
      second dialog here would train users to dismiss dialogs, which is the
      actual risk.
    */
    this.chainId = chainId;
    this.emit("chainChanged", toHexChainId(chainId));
    return null;
  }

  /* ── signing ────────────────────────────────────────────────────────────── */

  private async personalSign(params: unknown[]): Promise<string> {
    /*
      PARAMETER ORDER IS [message, address] AND IT IS BACKWARDS FROM
      eth_signTypedData_v4's [address, data]. That is a wart in the ecosystem,
      not in this file, and getting it wrong yields a signature over an address
      string — which verifies as a valid signature of the wrong thing. Some
      callers send them the other way round, so the address is detected by
      shape rather than by position.
    */
    const [a, b] = params as [string, string];
    const message = looksLikeAddress(a) && !looksLikeAddress(b) ? b : a;

    const address = this.requireAddress();
    await this.requireUnlocked("sign");
    await requestApproval({ kind: "signMessage", vm: "EVM", address, message });

    return signEvmMessage(message);
  }

  private async signTypedData(params: unknown[]): Promise<string> {
    const [, raw] = params as [string, unknown];
    const typedData =
      typeof raw === "string" ? safeParse(raw) : (raw as Record<string, unknown>);

    if (!typedData || typeof typedData !== "object") {
      throw new WalletRpcError(RPC_ERROR.INVALID_PARAMS, "Malformed typed data.");
    }

    const address = this.requireAddress();
    await this.requireUnlocked("sign");
    await requestApproval({ kind: "signTypedData", vm: "EVM", address, typedData });

    return signEvmTypedData(typedData);
  }

  private async sendTransaction(transaction: EvmTransactionRequest): Promise<string> {
    if (!transaction || typeof transaction !== "object") {
      throw new WalletRpcError(RPC_ERROR.INVALID_PARAMS, "No transaction given.");
    }

    const address = this.requireAddress();
    await this.requireUnlocked("sign");

    await requestApproval({
      kind: "sendTransaction",
      vm: "EVM",
      chainId: this.chainId,
      address,
      transaction,
    });

    return sendEvmTransaction(transaction, this.chainId);
  }

  /* ── everything else ────────────────────────────────────────────────────── */

  /**
   * Reads go straight to the chain.
   *
   * `eth_call`, `eth_getBalance`, `eth_getTransactionReceipt` and their kin
   * involve no key and no consent, and a wallet that could not answer them
   * would be one wagmi cannot use as a transport at all.
   */
  private async forward(method: string, params: unknown[]): Promise<unknown> {
    const chain = evmChain(this.chainId);
    if (!chain) {
      throw new WalletRpcError(
        RPC_ERROR.CHAIN_DISCONNECTED,
        "This wallet is not on a supported network."
      );
    }
    const client = evmPublicClient(this.chainId);
    return client.request({ method, params } as never);
  }

  /* ── guards ─────────────────────────────────────────────────────────────── */

  private requireAddress(): string {
    const address = addressFor("EVM");
    if (!address) {
      throw new WalletRpcError(
        RPC_ERROR.UNAUTHORIZED,
        "No wallet is available on this account."
      );
    }
    return address;
  }

  /**
   * Ask the user to unlock, and wait.
   *
   * This is the whole of departure (1) in the header: the page stays connected
   * through a lock, and the cost of that is paid HERE — one extra prompt at
   * signing time, in exchange for never silently disconnecting someone who was
   * reading a chart.
   */
  private async requireUnlocked(reason: "sign" | "connect"): Promise<void> {
    /*
      DELEGATED so the wallet's own send form runs the identical sequence. Two
      copies of "unlock, then consent, then sign" is two places for the order to
      drift, and the drift that matters is signing before asking.
    */
    await ensureUnlocked(reason);
  }
}

function looksLikeAddress(value: unknown): boolean {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function safeParse(value: string): Record<string, unknown> | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * One provider per page.
 *
 * A module singleton because EIP-6963 announces an object IDENTITY: a dapp that
 * stored the provider from one announcement and a second instance created later
 * would be two wallets with one address, disagreeing about which chain they are
 * on. Created lazily so importing this module on the server does nothing.
 */
let instance: PlatformWalletProvider | null = null;

export function platformWalletProvider(): PlatformWalletProvider {
  if (!instance) instance = new PlatformWalletProvider();
  return instance;
}
