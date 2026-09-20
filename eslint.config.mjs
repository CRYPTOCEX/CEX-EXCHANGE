import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginNext from "@next/eslint-plugin-next";
import pluginReactHooks from "eslint-plugin-react-hooks";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      "**/public/**",
      "**/node_modules/**",
      "**/.next/**",
      "**/lib/**",
      "**/dist/**",
      "**/build/**",
      "**/out/**",
      "**/.turbo/**",
      "**/coverage/**",
      "frontend/public/**",
      "frontend/components/(ext)/chart-engine/**",
      "frontend/i18n/generated/**",
      "frontend/i18n/loader.ts",
      "frontend/i18n/webpack-plugin-i18n-keys.js",
      "frontend/i18n/webpack-plugin-i18n.js",
      "backend/dist/**",
    ]
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    plugins: {
      "@next/next": pluginNext,
      "react-hooks": pluginReactHooks,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
      "@next/next/no-img-element": "off", // Disable img element warnings
      "@next/next/no-html-link-for-pages": "off", // Disable anchor tag warnings
      "react-hooks/rules-of-hooks": "off", // Disabled - many render helpers use hooks intentionally
      "react-hooks/exhaustive-deps": "off", // Disabled to prevent infinite loop issues with function dependencies
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-undef": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/prefer-as-const": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-duplicate-enum-values": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-unnecessary-type-constraint": "off",
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
      "@typescript-eslint/triple-slash-reference": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      // "react/jsx-no-literals": "error",
      "react/react-in-jsx-scope": "off",
      "react/no-unescaped-entities": "off",
      "no-undef": "off",
      "react/prop-types": "off",
      "react/no-unknown-property": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-useless-catch": "off",
    },
  },
  // Restricted imports for routing - applies to all files except i18n implementation
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["**/i18n/routing.tsx", "**/i18n/server-routing.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          name: "next/link",
          message: "Please import from `@/i18n/routing` instead.",
        },
        {
          name: "next/navigation",
          importNames: [
            "redirect",
            "permanentRedirect",
            "useRouter",
            "usePathname",
          ],
          message: "Please import from `@/i18n/routing` instead.",
        },
      ],
    },
  },
  /* The DEX addon is non-custodial. These are the platform's custodial money
     primitives; reaching for any of them makes it custodial by accident.
       - collectPlatformFee credits a Super-Admin WALLET and writes adminProfit,
         whose transactionId is NOT NULL over transaction.walletId NOT NULL —
         there is no record-only revenue path (backend/src/utils/fees.ts:234-305).
       - roundToPrecision rounds as a JS number at 8dp, destroying 18-decimal
         on-chain amounts (backend/src/services/wallet/utils/precision.ts:37-47).
       - getWalletByUserIdAndCurrency MINTS and encrypts a private key as a side
         effect of a READ (ecosystem/utils/wallet.ts:117-153).
       - walletType "ECO" is forbidden outright: createEcoWallet calls
         generateAddress() per active token and persists keys.
     NOTE the escaped brackets in the frontend globs. ESLint flat config matches
     with minimatch, where [locale] is a CHARACTER CLASS. Unescaped, these
     patterns match nothing and the rule is silently dead. */
  {
    files: [
      "backend/src/api/(ext)/dex/**/*.ts",
      "frontend/app/\\[locale\\]/(ext)/dex/**/*.{ts,tsx}",
      "frontend/app/\\[locale\\]/(ext)/admin/dex/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          // Re-listed from the routing block above, NOT duplicated by accident.
          // ESLint does not merge options for the same rule across matching
          // config objects — the last match wins outright. Without these two
          // entries `--print-config` on a DEX page shows only the custodial
          // paths, so the DEX tree would be the one part of the frontend where
          // raw next/link is allowed. Keep them in sync with lines 93-105.
          { name: "next/link",
            message: "Please import from `@/i18n/routing` instead." },
          { name: "next/navigation", importNames: ["redirect", "permanentRedirect", "useRouter", "usePathname"],
            message: "Please import from `@/i18n/routing` instead." },
          { name: "@b/utils/fees", importNames: ["collectPlatformFee", "recordPlatformLoss"],
            message: "credits a Super-Admin wallet; there is no record-only revenue path. Use the dexFeeAccrual path." },
          { name: "@b/api/(ext)/ecosystem/utils/wallet", importNames: ["getWalletByUserIdAndCurrency"],
            message: "MINTS and encrypts a private key as a side effect of a read." },
        ],
        patterns: [
          { group: ["@b/services/wallet", "@b/services/wallet/**"],
            message: "the DEX must never touch the custodial wallet service." },
          /*
            ════════════════════════════════════════════════════════════════════
            THE WALLET FACADE BOUNDARY, WHICH THE CODE CLAIMED WAS ENFORCED HERE
            AND WAS NOT.

            `use-dex-wallet.ts` opens with: "This is the ONLY module under
            app/[locale]/(ext)/dex that may import wagmi, @reown/appkit or
            @/config/wallet — enforced by an eslint `no-restricted-imports`
            override, not by convention (see eslint.config.js)." No such rule
            existed. The invariant held by luck.

            It is worth enforcing for the reason that file gives: a second wagmi
            entry point is not untidiness, it is two sources of truth that
            disagree SILENTLY. `readContracts` imported at a panel carries its
            own transports, so balances get read over a different RPC than the
            connection lives on; a panel calling `useAccount()` directly sees a
            connection state the reducer does not, which is how a ticket stays
            enabled for a wallet that just disconnected. Neither throws.

            `@/config/wallet` is in the list for a second reason: importing it
            EVALUATES it, which constructs the wagmi adapter and throws at module
            scope when NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is unset — see
            `config/dex-chain-ids.ts`, which exists solely to give non-wallet
            code the chain ids without that side effect.

            The two files that legitimately hold the boundary are exempted
            below, by path, so adding a third is a deliberate edit to this file
            rather than an import somebody added without noticing.
            ════════════════════════════════════════════════════════════════════
          */
          { group: ["wagmi", "wagmi/*", "@reown/appkit", "@reown/appkit/*", "@reown/appkit-adapter-*", "@/config/wallet"],
            message:
              "only the wallet facade may import wagmi/appkit. Reach the chain through `useDexWallet()`; " +
              "a second entry point is a second source of truth that disagrees silently. " +
              "For chain ids alone, import `@/config/dex-chain-ids`." },
        ],
      }],
      "no-restricted-syntax": ["error",
        { selector: "MemberExpression[object.name='models'][property.name='wallet']",
          message: "the DEX holds no user funds and owns no wallet rows." },
        { selector: "CallExpression[callee.name='roundToPrecision']",
          message: "8dp JS-number rounding destroys 18-decimal on-chain amounts." },
        { selector: "CallExpression[callee.name='getWalletByUserIdAndCurrency']",
          message: "MINTS and encrypts a private key as a side effect of a read." },
        { selector: "Literal[value='ECO']",
          message: "walletType ECO is forbidden in the DEX tree: createEcoWallet generates and persists keys." },
      ],
    },
  },
  /*
    THE TWO FILES THAT ARE THE BOUNDARY. `use-dex-wallet.ts` is the facade
    itself; `use-solana-wallet.ts` holds the Solana half of it, because AppKit's
    Solana provider is reached through a different hook than wagmi's and folding
    it into the EVM facade would mean that file importing both adapters.

    Listed by path rather than by an inline disable comment so the exemption is
    visible in one place — a `// eslint-disable-next-line` at the import site is
    exactly how a boundary quietly acquires a third member.
  */
  {
    files: [
      // MATCHED BY TAIL, NOT BY FULL PATH, and that is not laziness. Every
      // full-path frontend glob in this file has to escape the locale segment,
      // because minimatch reads an unescaped [locale] as a CHARACTER CLASS — a
      // pattern that then matches nothing, leaving the rule silently dead. This
      // exemption went in that way the first time and did exactly that. A
      // leading double-star prefix never touches the brackets, so the trap
      // cannot be reintroduced by an edit here.
      //
      // (Line comments, not a block: a block comment describing a glob wants to
      // contain the characters that CLOSE a block comment, and this one did.)
      "**/dex/swap/components/wallet/use-dex-wallet.ts",
      "**/dex/swap/components/wallet/use-solana-wallet.ts",
    ],
    rules: { "no-restricted-imports": "off" },
  },
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];
