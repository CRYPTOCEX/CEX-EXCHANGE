/**
 * EIP-6963 — how the in-house wallet becomes selectable everywhere at once.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ONE `window.dispatchEvent` REPLACES A BRANCH IN EVERY WALLET SURFACE.
 *
 * EIP-6963 is the standard by which a browser extension tells a page "I am a
 * wallet, here is my provider". wagmi listens for it; AppKit's modal lists what
 * wagmi found under "Installed". So announcing here is the entire integration:
 * the swap terminal, SIWE login, the profile wallet tab and the four NFT flows
 * all offer the in-house wallet without one line changing in any of them,
 * because none of them can tell it from MetaMask.
 *
 * ── IT ANNOUNCES TWICE, AND BOTH ARE REQUIRED ───────────────────────────────
 * The protocol is a handshake with a race built into it. A dapp that mounted
 * before us discovers wallets by listening for `eip6963:announceProvider`; a
 * dapp that mounts after us finds nothing, so it dispatches
 * `eip6963:requestProvider` and every wallet answers. Implementing only the
 * first means the wallet is invisible to any page that loaded it late — which,
 * in a Next.js app with a lazily mounted wallet provider, is most of them.
 *
 * ── WHY NOT `window.ethereum` ───────────────────────────────────────────────
 * Because that is a single global and the user may well have MetaMask. Writing
 * to it would either be overwritten by the extension or overwrite it, and the
 * loser is whichever loaded second — a coin flip that decides whether someone's
 * hardware wallet still works on this site. EIP-6963 exists precisely to end
 * that fight, and a new wallet has no excuse to reopen it.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { platformWalletProvider } from "./eip1193";

/**
 * The wallet's mark, inlined as a data URI because EIP-6963 requires one.
 *
 * Drawn rather than fetched: the icon appears in a wallet chooser that renders
 * before any network request this page makes has resolved, and a wallet with a
 * broken image in that list reads as broken software. It is deliberately not
 * the site logo — this is a wallet, and it should look like one next to
 * MetaMask's fox and Phantom's ghost.
 */
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
<rect width="96" height="96" rx="22" fill="url(#g)"/>
<path d="M24 34a8 8 0 0 1 8-8h30a6 6 0 0 1 0 12H34a2 2 0 0 0 0 4h34a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8V34Z" fill="#fff" fill-opacity=".95"/>
<circle cx="64" cy="59" r="5" fill="url(#g)"/>
<defs><linearGradient id="g" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
<stop stop-color="#6366F1"/><stop offset=".5" stop-color="#8B5CF6"/><stop offset="1" stop-color="#EC4899"/>
</linearGradient></defs></svg>`;

/**
 * `encodeURIComponent`, not base64.
 *
 * `btoa` throws on any non-Latin-1 character, so a future edit that put a
 * typographic dash in a `<title>` would break the icon at runtime with a
 * message about String.prototype.btoa. The percent-encoded form has no such
 * cliff and is marginally smaller for SVG.
 */
const ICON_DATA_URI = `data:image/svg+xml,${encodeURIComponent(ICON_SVG.replace(/\n/g, ""))}`;

/**
 * A stable reverse-DNS id, derived from the deployment's own host.
 *
 * MUST BE STABLE ACROSS RELOADS AND UNIQUE PER DEPLOYMENT. Wallet choosers key
 * their "last used" memory on it, so a value that changed per page load would
 * mean the user's own wallet never appears as the one they used last. Deriving
 * it from the host also stops two installs of this platform colliding inside a
 * browser that has both open.
 */
function rdns(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  let host = "";
  try {
    host = new URL(raw).hostname;
  } catch {
    host = "";
  }
  if (!host) return "app.wallet.platform";
  return host.split(".").reverse().join(".") + ".wallet";
}

function walletName(): string {
  const site = (process.env.NEXT_PUBLIC_SITE_NAME ?? "").trim();
  // "Acme Wallet" reads as a product; a bare site name in a wallet list reads
  // as a mistake.
  return site ? `${site} Wallet` : "Platform Wallet";
}

/**
 * The uuid is per PAGE LOAD by specification — it identifies this announcement,
 * not this wallet. `rdns` is the durable identity.
 */
function newUuid(): string {
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    // Older Safari. The value only has to be unique within this page.
    return `6963-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  }
}

let announced = false;

/**
 * Announce, and keep answering.
 *
 * IDEMPOTENT, because React 18's StrictMode mounts effects twice in
 * development and a second listener would answer every request twice — which
 * shows the wallet twice in the chooser, and only in dev, which is the worst
 * place to first notice it.
 */
export function announcePlatformWallet(): void {
  if (announced || typeof window === "undefined") return;
  announced = true;

  const detail = Object.freeze({
    info: Object.freeze({
      uuid: newUuid(),
      name: walletName(),
      icon: ICON_DATA_URI,
      rdns: rdns(),
    }),
    provider: platformWalletProvider(),
  });

  const announce = () => {
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", { detail })
    );
  };

  // Half two of the handshake: answer anyone who asks later.
  window.addEventListener("eip6963:requestProvider", announce);

  // Half one: tell anyone already listening.
  announce();
}
