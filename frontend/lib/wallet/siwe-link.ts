/**
 * THE ONE WALLET-LINK IMPLEMENTATION, FOR ALL FOUR VIRTUAL MACHINES.
 *
 * Linking an address to an account means proving control of it: fetch a
 * single-use nonce the server issued and bound in Redis, have the wallet sign
 * something carrying it, and post the result to
 * `POST /api/user/profile/wallet/connect`, which verifies the proof, spends the
 * nonce and writes the `providerUser` row.
 *
 * FOUR PROOFS, ONE CONTRACT. The chains do not agree on how ownership is shown,
 * so this file has three entry points rather than one:
 *
 *   linkWalletWithSiwe        EVM        SIWE (EIP-4361), secp256k1
 *   linkWalletWithSignature   SVM, TVM   a plaintext statement — see link-message.ts
 *   linkTonWallet             TON        `ton_proof`, at connect time
 *
 * All three return the same `SiweLinkResult` and post to the same route, so a
 * caller renders one set of outcomes whichever chain the user is on. What they
 * BIND is also the same on every chain — the site's domain, the address, a
 * single-use nonce and an expiry — because a proof missing any of those is one
 * a phishing page can harvest and relay.
 *
 * IT LIVES HERE, OUTSIDE ITS CALLERS, BECAUSE THERE ARE SEVERAL AND THEY MUST
 * NOT DRIFT. The profile wallet tab and the swap terminal both link, and the
 * same flow written twice is two chances to get the domain, the nonce shape or
 * the expiry window subtly different — and a message that disagrees with the
 * server's parser on any of those is rejected with a 401 the user cannot act on.
 *
 * IT IMPORTS NO WALLET LIBRARY. `signMessage` arrives as a parameter, so the
 * profile tab can pass wagmi's `useSignMessage` and the swap terminal can pass
 * its own facade method — the terminal is forbidden from importing wagmi
 * outside `use-dex-wallet.ts` by an eslint rule, and a helper that reached for
 * wagmi itself would either break that rule or force the terminal to duplicate
 * this file.
 *
 * THE SIGNATURE MUST COME FROM A CLICK. Nothing in here decides when to run;
 * both callers invoke it from a handler. A link flow started by an effect asks
 * the user to sign something they never requested, which is indistinguishable
 * from a phishing prompt — see the note on `handleLinkWallet` in the profile
 * wallet tab for the regression that taught us.
 */

import { SiweMessage } from "siwe";

import { buildLinkStatement } from "./link-message";

/**
 * The virtual machines a link can be proved on.
 *
 * THE SAME FOUR NAMES THE BACKEND USES (`dexChain.vm`, `@b/utils/wallet-link`),
 * deliberately. Two vocabularies for one concept is how a chain ends up EVM for
 * signing and something else for linking.
 */
export type WalletVm = "EVM" | "SVM" | "TVM" | "TON";

/** Everything a caller must supply. Nothing here is optional. */
export interface SiweLinkArgs {
  /** EIP-55 checksummed. `SiweMessage` validates the checksum and throws on a fold. */
  address: string;
  /** EIP-155 chain id the wallet is currently on. */
  chainId: number;
  /** Signs an arbitrary UTF-8 string with the connected account. */
  signMessage: (message: string) => Promise<string>;
}

/**
 * A Solana or TRON link: one plaintext statement, one signature.
 *
 * The two chains differ only in how the signature is encoded — base64 for
 * Solana's raw Ed25519 bytes, hex for TRON's 65-byte secp256k1 — and the
 * caller's `signMessage` is responsible for producing the right one, because
 * the caller is the wallet facade that knows which chain it is talking to.
 */
export interface PlaintextLinkArgs {
  vm: "SVM" | "TVM";
  address: string;
  /** The PLATFORM's chain id, recorded for provenance. */
  chainId: number | null;
  signMessage: (message: string) => Promise<string>;
}

/**
 * A TON link. Not a signature over text — a `ton_proof`.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * TON IS THE ONE CHAIN WHERE THE PROOF ARRIVES AT *CONNECT* TIME.
 *
 * A TON address is the hash of a contract, not of a key, so a bare signature
 * says nothing about which account produced it. TON Connect's answer is
 * `ton_proof`: the dApp asks for it as part of the connection request, and the
 * wallet returns it alongside the account — with the public key and the state
 * init needed to tie the two together.
 *
 * The consequence for the UI is real and cannot be engineered away: a wallet
 * that is ALREADY connected has to reconnect to produce one. That is why the
 * caller here supplies a `requestProof` that owns the modal, rather than this
 * function driving it.
 * ══════════════════════════════════════════════════════════════════════════════
 */
export interface TonLinkArgs {
  vm: "TON";
  chainId: number | null;
  /** Runs the TON Connect proof request. Resolves null if the user closed it. */
  requestProof: (nonce: string) => Promise<TonProofBundle | null>;
}

export interface TonProofBundle {
  /** Raw address, `<workchain>:<hex>`. */
  address: string;
  publicKey: string;
  walletStateInit?: string;
  proof: {
    timestamp: number;
    domain: { lengthBytes: number; value: string };
    payload: string;
    signature: string;
  };
}

export type SiweLinkResult =
  | { ok: true; alreadyLinked: boolean }
  /**
   * `rejected` is a NORMAL outcome, not a failure — cancelling in your own
   * wallet is a thing users do. Callers render it quietly; they must not show
   * a destructive toast for it.
   */
  | { ok: false; reason: "rejected" | "taken" | "unavailable" | "error"; message: string };

/**
 * Ask the server for a single-use nonce.
 *
 * The endpoint has returned the nonce as a raw string, as a JSON-quoted string
 * and as `{ nonce }` at different points in this codebase's life, so all three
 * are normalised rather than assumed.
 */
async function fetchServerNonce(): Promise<string> {
  const res = await fetch("/api/auth/login/nonce", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error("Failed to obtain a login nonce. Please try again.");
  }
  let nonce = (await res.text()).trim();
  try {
    const parsed = JSON.parse(nonce);
    if (typeof parsed === "string") nonce = parsed;
    else if (parsed && typeof parsed === "object" && typeof parsed.nonce === "string")
      nonce = parsed.nonce;
  } catch {
    /* already a raw string */
  }
  if (!nonce || nonce.length < 8) {
    throw new Error("Received an invalid login nonce. Please try again.");
  }
  return nonce;
}

/** EIP-1193 4001 / ethers ACTION_REJECTED / a message that says so. */
function isUserRejection(error: unknown): boolean {
  const code = (error as any)?.code;
  return (
    code === 4001 ||
    code === "ACTION_REJECTED" ||
    /user rejected|user denied|rejected the request/i.test(
      String((error as any)?.message ?? "")
    )
  );
}

/**
 * Prove control of `address` and link it to the signed-in account.
 *
 * RESOLVES, NEVER THROWS. Every caller renders the outcome; none of them has
 * anything useful to do with an exception, and the terminal in particular must
 * not lose its wallet facade's "every action resolves" contract to this one
 * call.
 *
 * `alreadyLinked: true` is a SUCCESS. The backend answers "Wallet already
 * registered" with a 200 when the row exists for this user, and to the caller
 * that is the same state as having just linked it — the gate that prompted the
 * link will now pass.
 */
export async function linkWalletWithSiwe(args: SiweLinkArgs): Promise<SiweLinkResult> {
  const { address, chainId, signMessage } = args;

  let message: string;
  let signature: string;
  try {
    const siwe = new SiweMessage({
      /*
        `window.location.host` — host, INCLUDING the port, never `hostname`.
        `expectedSiweDomain()` on the server compares against the configured
        site URL's host, and a message signed for `example.com` when the server
        expects `example.com:3000` is refused with a 401 that names nothing the
        user can fix.
      */
      domain: window.location.host,
      address,
      statement: "Sign in with Ethereum to P2P Platform",
      uri: window.location.origin,
      version: "1",
      chainId,
      nonce: await fetchServerNonce(),
      issuedAt: new Date().toISOString(),
      // Five minutes. Long enough for a mobile deep-link round trip to a wallet
      // app and back, short enough that a captured message is worthless.
      expirationTime: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    message = siwe.prepareMessage();
    signature = await signMessage(message);
  } catch (error) {
    return classifySigningFailure(error);
  }

  // No `vm` field: absent means EVM on the route, which is what keeps every
  // caller that predates the other three chains working unchanged.
  return postLink({ message, signature });
}

/**
 * POST the proof and turn the answer into a `SiweLinkResult`.
 *
 * ONE RESPONSE CONTRACT FOR ALL FOUR VMs. The route is the same for every
 * chain — see the `vm` discriminator note in `connect.post.ts` — so the 409,
 * the 403 and the already-registered success mean the same thing whichever
 * proof got there, and reading them in four places would be four chances to
 * classify one of them wrongly.
 */
async function postLink(body: Record<string, unknown>): Promise<SiweLinkResult> {
  /*
    A BARE `fetch`, NOT `$fetch`. The platform helper never throws and reports
    errors through an envelope, but it also raises a toast of its own — and this
    call already has a caller that renders the outcome in place, inside the swap
    ticket. Two notifications for one action is how a terminal starts shouting.
  */
  try {
    const res = await fetch("/api/user/profile/wallet/connect", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });

    /*
      HTTP 200 IS NOT ALWAYS SUCCESS ON THIS PLATFORM, but this route is one of
      the ones that does use real status codes — 401 for a bad signature, 409
      for an address that belongs to somebody else, 403 when wallet
      authentication is switched off. Read the body for the sentence either way,
      because that sentence is the only thing that tells the user WHICH it was.
    */
    const text = await res.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      /* a non-JSON body is still a body */
    }
    const serverMessage =
      (typeof payload === "string" ? payload : payload?.message) ?? text ?? "";

    if (res.ok) {
      return { ok: true, alreadyLinked: /already registered/i.test(String(serverMessage)) };
    }
    if (res.status === 409) {
      return {
        ok: false,
        reason: "taken",
        message:
          String(serverMessage) ||
          "This wallet address is already linked to a different account.",
      };
    }
    if (res.status === 403) {
      /*
        THE ONE REFUSAL NO USER CAN RESOLVE. `ensureWalletConnectAvailable`
        gates this route on the `wallet_connect` extension being enabled AND
        licensed, so on an install that has the swap addon but not that one, the
        link door does not exist. Named separately so callers can say so
        instead of telling the user to try again forever.
      */
      return {
        ok: false,
        reason: "unavailable",
        message:
          String(serverMessage) ||
          "Wallet linking is not available on this platform right now.",
      };
    }
    return {
      ok: false,
      reason: "error",
      message: String(serverMessage) || "Could not link this wallet. Please try again.",
    };
  } catch (error) {
    return {
      ok: false,
      reason: "error",
      message:
        error instanceof Error && error.message
          ? error.message
          : "Could not reach the server to link this wallet.",
    };
  }
}

/* -- the non-EVM entry points --------------------------------------------- */

/**
 * Prove control of a Solana or TRON address and link it.
 *
 * SAME FOUR BINDINGS AS SIWE — domain, address, nonce, expiry — carried in a
 * plaintext statement rather than EIP-4361, because neither chain has a
 * standard grammar and inventing one that the server parses strictly is better
 * than signing a bare nonce that any site could have asked for.
 */
export async function linkWalletWithSignature(
  args: PlaintextLinkArgs
): Promise<SiweLinkResult> {
  const { vm, address, chainId, signMessage } = args;

  let message: string;
  let signature: string;
  try {
    message = buildLinkStatement(vm, {
      // `host`, INCLUDING the port — `expectedSiweDomain()` on the server
      // compares against the configured site URL's host, and `hostname` would
      // drop the `:3000` a dev install has.
      domain: window.location.host,
      address,
      nonce: await fetchServerNonce(),
    });
    signature = await signMessage(message);
  } catch (error) {
    return classifySigningFailure(error);
  }

  return postLink({ vm, address, chainId, message, signature });
}

/**
 * Prove control of a TON address and link it.
 *
 * The nonce is fetched here and handed to `requestProof`, which is the caller's
 * because only it owns the TON Connect modal. A null result means the user
 * closed that modal, which is the same normal outcome as declining a signature.
 */
export async function linkTonWallet(args: TonLinkArgs): Promise<SiweLinkResult> {
  let bundle: TonProofBundle | null;
  try {
    bundle = await args.requestProof(await fetchServerNonce());
  } catch (error) {
    return classifySigningFailure(error);
  }

  if (!bundle) {
    return {
      ok: false,
      reason: "rejected",
      message: "Linking was cancelled. Your wallet is still connected; nothing was linked.",
    };
  }

  return postLink({
    vm: "TON",
    address: bundle.address,
    chainId: args.chainId,
    proof: {
      address: bundle.address,
      publicKey: bundle.publicKey,
      timestamp: bundle.proof.timestamp,
      domain: bundle.proof.domain,
      payload: bundle.proof.payload,
      signature: bundle.proof.signature,
    },
    walletStateInit: bundle.walletStateInit,
  });
}

/* -- shared plumbing ------------------------------------------------------- */

/** A cancelled prompt is a NORMAL outcome; everything else carries a sentence. */
function classifySigningFailure(error: unknown): SiweLinkResult {
  if (isUserRejection(error)) {
    return {
      ok: false,
      reason: "rejected",
      message: "Signature cancelled. Your wallet is still connected; nothing was linked.",
    };
  }
  return {
    ok: false,
    reason: "error",
    message:
      error instanceof Error && error.message
        ? error.message
        : "Could not prepare the linking signature. Please try again.",
  };
}
