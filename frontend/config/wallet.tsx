// MUST stay the first import: appkit's web components are built on Lit, and
// this seeds Lit's warning-dedupe set before Lit's module body evaluates.
import '@/lib/silence-lit-dev-warning'
import { appKitNetworkToChainId } from '@/config/dex-chain-ids'
import { cookieStorage, createStorage, noopStorage } from 'wagmi'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { mainnet, arbitrum, polygon, optimism, base, bsc, avalanche, linea, celo, cronos, fantom, rootstock, solana, type AppKitNetwork } from '@reown/appkit/networks'

// NO FALLBACK ID, AND NO THROW EITHER — two different decisions.
//
// No fallback: a default makes every misconfigured deploy silently run on
// somebody else's WalletConnect project — and verifySignature() interpolates
// this id into rpc.walletconnect.org (backend/src/api/auth/utils.ts), so a
// revoked shared id breaks server-side signature verification with no message
// anywhere. Empty stays empty.
//
// No throw: this module used to `throw` here when the id was unset, under a
// comment that said "at build time". It never ran at build time. Every reader
// that can evaluate this module sits under `LazyWalletProvider` — next/dynamic
// with `ssr: false` — or reaches it through its own dynamic import() in a
// click handler, so `next build` never evaluated it, and the throw fired in the
// VISITOR'S browser instead: the dynamic import rejected, React.lazy re-threw
// it, and the segment's error boundary painted the whole page as "500 —
// Something went wrong" on /user/profile?tab=wallet, /dex/swap, the four NFT
// flows and wallet sign-in. An install that copied .env.example (which did not
// carry this variable) shipped exactly like that, with the only explanation in
// the browser console. See e2e/unit/frontend/context/wallet-config-contract.test.ts.
//
// So the absence is a STATE now, not an exception: `walletConfigured` is false,
// nothing below is constructed, and `context/wallet.tsx` renders a notice that
// names the variable in place of the wallet tree. `next.config.js` warns at
// build time — which is where the old message believed it already was.
export const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || undefined

/** True when a WalletConnect project id was inlined into this build. */
export const walletConfigured = Boolean(projectId)

// Three leftover debug lines used to run here on every page load, dumping the
// WalletConnect project id and the full list of NEXT_PUBLIC_* variable names to
// the console. Removed: they answered a question that is long since answered,
// and the env-var inventory is not something to print for every visitor.

/**
 * Define supported networks, explicitly typed as a non-empty array of AppKitNetworks.
 *
 * `solana` IS NOT AN EVM NETWORK AND DOES NOT BEHAVE LIKE ONE HERE. Its `id` is
 * the base58 genesis hash, not a number, so anything doing `Number(network.id)`
 * gets NaN — use `appKitNetworkToChainId` from `config/dex-chain-ids.ts`, which
 * is the one place that crosses between AppKit's CAIP identifiers and this
 * platform's numeric chain ids.
 */
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, polygon, arbitrum, optimism, base, bsc, avalanche, linea, celo, cronos, fantom, rootstock, solana]

/**
 * The server owns WHICH chains are enabled; the client owns WHAT they are.
 * AppKitNetwork objects carry viem chain definitions — multicall addresses, fee
 * formulas, block explorers — and cannot be reconstructed from the JSON
 * GET /api/dex/chain returns, so the candidate set stays a static import here
 * and the server response only FILTERS it.
 *
 * THIS LIST AND `DEX_CHAIN_STATIC` ARE ONE LIST IN TWO FILES, and adding a chain
 * to one without the other is the failure this comment used to only warn about:
 * a server chain with no AppKit network is offered by the switcher and cannot be
 * switched to; an AppKit network with no server entry is a chain nothing can
 * quote. `e2e/unit/backend/dex/chain-registry.test.ts` now fails the build on
 * either, by parsing both files — so the two can no longer drift quietly.
 *
 * Note there is no root WagmiProvider in this app — LazyWalletProvider is
 * mounted at seven leaf sites (wallet login, profile wallet tab, four NFT flows,
 * and the Swap terminal) — so a caller of networksFor() must mount its own
 * AppKit provider and cannot assume wagmi context already exists.
 */
const ALL_DEX_NETWORKS: AppKitNetwork[] = [mainnet, polygon, arbitrum, optimism, base, bsc, avalanche, linea, celo, cronos, fantom, rootstock, solana]

export function networksFor(
  enabledChainIds: number[]
): [AppKitNetwork, ...AppKitNetwork[]] {
  // `appKitNetworkToChainId`, not `Number(n.id)`: Solana's id is a base58
  // genesis hash and `Number()` of it is NaN, which `includes()` never matches —
  // so Solana would be filtered out of every enabled set, silently, forever.
  const picked = ALL_DEX_NETWORKS.filter((n) => {
    const id = appKitNetworkToChainId(n.id)
    return id !== null && enabledChainIds.includes(id)
  })
  // AppKit's networks prop is a non-empty tuple and it throws deep inside the
  // adapter on an empty array, so refuse here where the message is readable.
  if (!picked.length) throw new Error('No DEX chain enabled')
  return picked as [AppKitNetwork, ...AppKitNetwork[]]
}

/**
 * Persisted wagmi storage. AUTO-CONNECT IS ON, AND THAT IS A DELIBERATE REVERSAL.
 *
 * This USED to be a filtering adapter whose getItem returned null and whose
 * setItem no-opped for any key containing `recentConnector` or `store`. wagmi
 * therefore had nothing to rehydrate and EVERY MOUNT WAS DISCONNECTED.
 *
 * That is unusable for the Swap terminal. Signing on mobile deep-links out to
 * the wallet app and returns to a cold page load; with the filter in place the
 * user came back to a Connect button while their transaction was already in the
 * mempool, with no way for the page to know it existed.
 *
 * THE FILTER WAS GUARDING SOMETHING REAL, AND THAT THING WAS FIXED, NOT DROPPED.
 * The hazard was an effect on the profile wallet tab that built and signed a
 * SIWE message the moment a connection appeared — with reconnect on, that fires
 * on page open and pops an unrequested signature prompt. It is now an explicit
 * "Link this wallet to my account" button:
 *   app/[locale]/(dashboard)/user/profile/components/tabs/wallet-tab.tsx
 * Do not re-introduce the filter without re-introducing that guard, and do not
 * re-introduce an auto-signing effect anywhere without turning this back off.
 *
 * A DEX-private config is not an option: createAppKit() is a module-scope
 * singleton (context/wallet.tsx), so there is exactly one wagmi config in the
 * app and this change is necessarily global. Blast radius is the seven
 * LazyWalletProvider leaf sites, swept in e2e/ui/dex/wallet-fixture.pw.mjs.
 */
const persistentStorage = createStorage({
  storage: (() => {
    if (typeof window === 'undefined') return noopStorage;
    try {
      // READING `window.localStorage` CAN THROW — a SecurityError when the
      // browser blocks site data ("block all cookies", some embedded
      // webviews). At module scope in this ssr:false chunk that throw has the
      // exact blast radius the missing-project-id throw had: the segment's
      // whole-page 500. Same rule, then: degrade, never detonate. wagmi on
      // noopStorage simply forgets the connection between visits.
      return window.localStorage;
    } catch {
      return noopStorage;
    }
  })(),
  key: 'wagmi',
});

/*
  EVERYTHING FROM HERE DOWN IS NULL ON AN UNCONFIGURED BUILD.

  Both adapters take the project id in their constructors; without one the
  WalletConnect transport they build is unusable, and AppKit refuses the
  configuration outright. Skipping construction is the only honest option.

  Null is never dereferenced, only skipped: `context/wallet.tsx` does not mount
  WagmiProvider when `walletConfigured` is false, and the one other reader of
  `config` — swap/components/wallet/use-dex-wallet.ts — runs only inside that
  provider, so by the time it calls wagmi with `config` the adapter exists.
*/
export const wagmiAdapter: WagmiAdapter | null = walletConfigured
  ? new WagmiAdapter({
      storage: persistentStorage,
      ssr: true,
      projectId: projectId as string,
      networks,
    })
  : null

/**
 * THE SOLANA ADAPTER — a SECOND adapter, not a replacement.
 *
 * AppKit takes an ARRAY of adapters and routes each network to whichever one
 * claims its CAIP namespace: wagmi answers for `eip155:*`, this one for
 * `solana:*`. Without it, `solana` in `networks` above is a network AppKit lists
 * and cannot connect to — the modal shows it, the user picks it, and nothing
 * happens.
 *
 * `wallets: []` IS DELIBERATE AND IS NOT "NO WALLETS". The adapter discovers
 * injected Solana wallets through the Wallet Standard (`@wallet-standard/app`),
 * which is how Phantom, Solflare, Backpack and every modern Solana wallet
 * announce themselves — plus WalletConnect for mobile. Passing an explicit list
 * would REPLACE that discovery with a hardcoded set, so a wallet the user
 * actually has installed would stop appearing the moment it was not on our list.
 * The empty array keeps discovery as the mechanism.
 *
 * THIS ADAPTER HOLDS NO KEY, exactly like the wagmi one. It brokers a connection
 * to software the user already runs and asks it to sign; the transaction it
 * signs is bytes this platform's server rendered. That is the same contract the
 * EVM side has, and the backend guards (`dex-invariants.mjs`,
 * `backend/eslint.config.mjs`) enforce the server half of it.
 */
export const solanaAdapter: SolanaAdapter | null = walletConfigured
  ? new SolanaAdapter({
      wallets: [],
    })
  : null

/*
  `config` ON AN UNCONFIGURED BUILD IS A THROWING PROXY, NOT NULL.

  Eleven call sites reach this config through a dynamic
  `import("@/config/wallet")` inside click handlers — the NFT mint/list/buy
  flows, utils/nft-*.ts, utils/enable-public-mint.ts and the NFT wallet store —
  and none of them render inside WalletProvider, so the provider's notice
  cannot shield them. Under the old module-scope throw those imports rejected
  with the variable's name; with a plain `null` they would instead die inside
  wagmi with "Cannot read properties of null", which reads as a wagmi bug.
  The Proxy keeps the failure at the same call sites but gives it back its
  name. `WalletProvider` never touches it: its gate checks `walletConfigured`
  first.

  `any` absorbs the viem version skew between @reown/appkit and wagmi.
*/
const unconfiguredConfig = new Proxy(
  {},
  {
    get(_target, prop) {
      throw new Error(
        'Wallet connection is not configured: NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ' +
          `is not set in this build (attempted to read config.${String(prop)}). ` +
          'Set it in .env and REBUILD the frontend — the value is compiled into the bundle.'
      );
    },
  }
);

export const config = (wagmiAdapter?.wagmiConfig ?? unconfiguredConfig) as any
