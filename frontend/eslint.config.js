/**
 * eslint-config-next 16 ships a native flat config, so FlatCompat is no longer
 * needed — and no longer works. Running it through FlatCompat on ESLint 9.39.5
 * threw "TypeError: Converting circular structure to JSON" from
 * @eslint/eslintrc's schema validator (the circular-JSON error is raised while
 * FORMATTING the real validation failure, so it hides its own cause).
 *
 * That, plus `next lint` being removed in Next 16, meant `pnpm lint` had been
 * a no-op. Both are fixed here: this config is flat-native and package.json
 * now calls `eslint` directly.
 */
const nextCoreWebVitals = require('eslint-config-next/core-web-vitals');

// Design-system ratchet patterns. Shared with scripts/scan-design-debt.js via
// this module so the rule and the CI gate can never drift apart.
//
// ALL FOUR exported patterns are wired up. Only the two colour ones were, and
// the omission had a specific cost: `design-system-patterns.js` says its two
// consumers "must never drift", and they had — the scanner gated four dimensions
// while the editor showed two. A developer typing `bg-danger-500` or
// `` `gap-${n}` `` got no squiggle at all, learned nothing, and found out at
// push time, which is precisely the feedback loop the ESLint half exists to
// shorten. Both are DEAD CLASSES: they compile to nothing and the element
// silently loses the style, so they are a stronger defect than a hardcoded
// colour, not a weaker one.
const {
  BANNED_PALETTE,
  BANNED_DARK,
  BANNED_FAKE_TOKEN,
  BANNED_RUNTIME_CLASS_AST,
} = require('./scripts/design-system-patterns');

const PALETTE_MSG =
  'Hardcoded palette colour. Use a design token instead — mapping table in ' +
  'frontend/DESIGN-SYSTEM.md §4 (e.g. bg-zinc-900 -> bg-card, text-zinc-400 -> ' +
  'text-muted-foreground, text-green-500 -> text-up for price / text-success for status).';

const DARK_MSG =
  'dark: colour variant. Design tokens are already theme-aware, so this is a ' +
  'deletion, not a migration — drop the whole variant (DESIGN-SYSTEM.md R5).';

const FAKE_TOKEN_MSG =
  'This design system\'s colour tokens are FLAT — there is no --color-muted-800, ' +
  'so this class compiles to NOTHING and the element silently loses the style. ' +
  'Drop the numeric step: text-muted-800 -> text-muted-foreground, ' +
  'bg-danger-500 -> bg-destructive.';

const RUNTIME_CLASS_MSG =
  'Tailwind discovers classes by scanning source TEXT, so an interpolated class ' +
  'name is never emitted and this always fails silently. Map the value to whole ' +
  'class names instead: {2: "grid-cols-2", 3: "grid-cols-3"}[n].';

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/build/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/public/**',
      // Only the vendored/built parts of chart-engine are ignored now. The whole
      // directory used to be, which meant the design rule never saw 448 source
      // files. NOTE: the app resolves `chart-engine/dist/index.js`, not the
      // source — edits there are invisible until the addon is rebuilt.
      '**/components/(ext)/chart-engine/node_modules/**',
      '**/components/(ext)/chart-engine/dist/**',
      '**/i18n/generated/**',
    ],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
    },
  },

  // ---------------------------------------------------------------------------
  // Design system ratchet — see frontend/DESIGN-SYSTEM.md
  //
  // Blocks NEW hardcoded palette colours, dark: colour forks, fake tokens and
  // runtime-built class names. The baseline (eslint.designsystem.baseline.js) is
  // empty, so this is live across the whole tree.
  //
  // Keep these patterns EQUIVALENT to the ones in scripts/design-dimensions.js,
  // which reports progress and regenerates the baseline. Equivalent, not
  // identical: `BANNED_RUNTIME_CLASS` matches the literal characters `${`, which
  // ESLint never sees because the parser has already consumed them —
  // `TemplateElement.value.raw` is the chunk BETWEEN interpolations. That is why
  // this file uses `BANNED_RUNTIME_CLASS_AST`, which anchors at end-of-chunk
  // instead. Using the text pattern here produced a rule that matched nothing at
  // all, verified against `` `md:grid-cols-${n}` ``.
  //
  // The negative lookbehind is load-bearing. Without it `my-custom-blue-500`
  // false-positives; and an anchor-alternation like (^|[\s:'"`]) MISSES
  // `bg-blue-500` in the middle of a className string, which is where most of
  // them live.
  // ---------------------------------------------------------------------------
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=/${BANNED_PALETTE}/]`,
          message: PALETTE_MSG,
        },
        {
          // classnames routinely live in cn(`...`) template literals; a
          // Literal-only rule would miss every one of them.
          selector: `TemplateElement[value.raw=/${BANNED_PALETTE}/]`,
          message: PALETTE_MSG,
        },
        {
          selector: `Literal[value=/${BANNED_DARK}/]`,
          message: DARK_MSG,
        },
        {
          selector: `TemplateElement[value.raw=/${BANNED_DARK}/]`,
          message: DARK_MSG,
        },
        {
          selector: `Literal[value=/${BANNED_FAKE_TOKEN}/]`,
          message: FAKE_TOKEN_MSG,
        },
        {
          selector: `TemplateElement[value.raw=/${BANNED_FAKE_TOKEN}/]`,
          message: FAKE_TOKEN_MSG,
        },
        /* Runtime-built classes are TemplateElement-only by construction: the
           defect IS the `${`, so a plain Literal cannot contain one. Listing a
           Literal selector here would be dead config. */
        {
          selector: `TemplateElement[value.raw=/${BANNED_RUNTIME_CLASS_AST}/]`,
          message: RUNTIME_CLASS_MSG,
        },
      ],
    },
  },

  // This config file quotes real palette class names in its own error message
  // ("bg-zinc-900 -> bg-card", …), which the rule would then flag. The message
  // is worth more than the self-consistency.
  {
    files: ['eslint.config.js', 'scripts/scan-design-debt.js'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  // ---------------------------------------------------------------------------
  // Payment-gateway checkout skins — a PRODUCT FEATURE, permanently exempt.
  //
  // `gatewayCheckoutDesign` is an admin setting with its own picker and live
  // preview at /admin/gateway/settings/design; it chooses between five named
  // looks — Starter, Dark Premium, Purple Glass, Luxury Gold, Cyber Tech. Their
  // palettes ARE the thing being selected. Migrating them onto the Obsidian
  // tokens would render all five identical and silently delete a shipped,
  // configurable feature.
  //
  // Kept in sync with SKIP_PATHS in scripts/scan-design-debt.js, so the debt
  // number does not carry work nobody intends to do.
  // ---------------------------------------------------------------------------
  {
    files: [
      'app/[[]locale[]]/(ext)/gateway/checkout/[[]paymentIntentId[]]/designs/**',
      'app/[[]locale[]]/(ext)/admin/gateway/settings/design/**',
    ],
    rules: { 'no-restricted-syntax': 'off' },
  },

  // ---------------------------------------------------------------------------
  // The DEX wallet-facade boundary.
  //
  // Exactly one module under (ext)/dex may touch wagmi/AppKit:
  //   app/[locale]/(ext)/dex/swap/components/wallet/use-dex-wallet.ts
  // and its siblings in that directory. Everything else goes through the facade.
  //
  // WHY THIS IS LINT AND NOT A CONVENTION. A second wagmi entry point is not a
  // style problem. `readContracts(config, …)` imported directly elsewhere would
  // carry its own transports, so balances would be read over a different RPC
  // than the one the connection lives on; and a panel calling `useAccount()`
  // straight from wagmi sees a connection state the terminal's own reducer does
  // not, which is how a ticket ends up enabled for a wallet that just
  // disconnected. Neither failure throws — they just disagree.
  //
  // ethers is banned for a separate reason: every ethers path in this repo
  // reaches the chain through `new BrowserProvider(window.ethereum)`, which
  // does not exist for a WalletConnect session. Mobile users connect, then
  // silently cannot sign.
  //
  // The exemption is expressed as an `ignores` glob rather than inline
  // eslint-disable comments so that it cannot spread file by file.
  // Brackets are escaped `[[]locale[]]` — the same minimatch escaping the
  // gateway-checkout block above uses; `[locale]` unescaped is a character
  // class and silently matches nothing.
  // ---------------------------------------------------------------------------
  {
    files: ['app/[[]locale[]]/(ext)/dex/**/*.{ts,tsx}'],
    ignores: ['app/[[]locale[]]/(ext)/dex/swap/components/wallet/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: [
              'wagmi', 'wagmi/*', '@wagmi/*',
              '@reown/appkit', '@reown/appkit/*',
              '@/config/wallet', '@/context/wallet',
            ],
            message:
              'Route every chain call through swap/components/wallet/use-dex-wallet.ts. ' +
              'A second wagmi entry point means a second RPC config and a connection ' +
              'state the terminal cannot see.',
          },
          {
            group: ['ethers', 'ethers/*'],
            message:
              'The DEX uses viem/wagmi. ethers here means a window.ethereum path, ' +
              'which WalletConnect mobile cannot sign.',
          },
        ],
      }],
    },
  },

  // Must come last: turns the rule off for files that are not migrated yet.
  ...require('./eslint.designsystem.baseline.js'),
];
