import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    ignores: ['dist/', 'node_modules/', '**/*.js', '**/*.test.ts', '**/*.spec.ts']
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      },
      globals: {
        console: true,
        process: true,
        Buffer: true,
        __dirname: true,
        __filename: true,
        global: true,
        require: true,
        module: true,
        exports: true
      }
    },
    /* Registered but NOT enabled. The engine bridges deliberately use lazy
       require() to break import cycles and to keep optional broker SDKs off
       the boot path, and each of those lines carries an inline
       `eslint-disable-next-line @typescript-eslint/no-require-imports`. With
       the plugin absent, ESLint cannot resolve those rule names and reports
       "Definition for rule ... was not found" as an ERROR at every one of
       them - 36 of them, which was this package's entire error count.
       Registering the plugin makes the directives resolve; the rules stay off,
       so the require() calls remain allowed. */
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      'no-console': 'off',
      'prefer-const': 'warn',
      'no-unreachable': 'error',
      'no-duplicate-case': 'error',
      'no-empty': 'warn',
      'no-extra-semi': 'warn',
      'no-irregular-whitespace': 'warn',
      'no-unused-vars': 'off',
      'no-case-declarations': 'off',
      'no-prototype-builtins': 'off',
      'no-useless-escape': 'warn',
      'no-control-regex': 'warn'
    }
  },
  {
    /*
      THE DEX CUSTODIAL BOUNDARY.

      This addon is non-custodial and its amounts are uint256. Two rules, and
      each guards a failure that is silent rather than loud:

        no-restricted-imports — the wallet service speaks in JS numbers rounded
          to 8dp. An 18-decimal amount exceeds Number.MAX_SAFE_INTEGER at nine
          tokens, so an amount that wanders into it does not throw, it just
          becomes wrong in its low digits. Exactly ONE file may cross:
          `to-creditable-amount.ts`, which converts explicitly and RECORDS the
          residue, and carries the matching eslint-disable.

        no-restricted-syntax on the literal "ECO" — `createEcoWallet` calls
          generateAddress() per active token, which MINTS AND PERSISTS PRIVATE
          KEYS. In a non-custodial addon that is the single worst thing this
          code could accidentally do. The literal is also grepped by the
          release gate, because one eslint-config regression is all it takes.

      PHASE 8 EXTENDS THIS FROM CUSTODY TO DEPLOYMENT AND SIGNING.

      Phase 8 is the first time the DEX tree legitimately imports ethers CONTRACT
      objects — it reads pool reserves and encodes swap calldata. The distance
      between "encode calldata for the operator to sign" and "deploy a contract
      with a server-held key" is A SINGLE IMPORTED SYMBOL, and the capability is
      one import away: `deployTokenContract()` already decrypts the ecosystem
      master wallet and signs with it.

      So `Contract`, `Interface` and `JsonRpcProvider` stay allowed and
      `ContractFactory` and `Wallet` do not. READ AND ENCODE, NEVER SIGN OR
      DEPLOY. `scripts/dex-invariants.mjs` greps for the same symbols, because a
      guard that lives only in an eslint config is a guard one config edit
      removes.
    */
    files: [
      'src/api/(ext)/dex/**/*.ts',
      'src/api/(ext)/admin/dex/**/*.ts',
      '../models/ext/dex/**/*.ts'
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: '@b/api/(ext)/ecosystem/utils/tokens',
            importNames: ['deployTokenContract'],
            message:
              'deploys an ERC20 signed by the master wallet\'s decrypted key. ' +
              'The DEX deploys nothing — a pool is deployed by the third-party factory.'
          },
          {
            name: '@b/api/(ext)/ecosystem/utils/smartContract',
            importNames: ['getSmartContract'],
            message:
              'loads ABI+BYTECODE for deployment and throws without both. The DEX ' +
              'needs ABI fragments only — use dex/utils/onchain/abis.ts.'
          },
          {
            name: '@b/utils/encrypt',
            importNames: ['decrypt'],
            message:
              'the DEX never decrypts key material. Every transaction is signed by ' +
              'the user\'s or the operator\'s own wallet.'
          },
          {
            name: 'ethers',
            importNames: ['ContractFactory', 'Wallet', 'HDNodeWallet'],
            message:
              'the DEX deploys nothing and signs nothing. A pool is deployed by the ' +
              'third-party factory; creation and seeding are calldata for the operator ' +
              'to sign. Contract, Interface and JsonRpcProvider remain allowed.'
          },
          /*
            ── THE SAME BOUNDARY, TRANSPOSED TO SOLANA ──────────────────────────
            Everything above was written for EVM and stopped exactly at the EVM
            edge. `@b/blockchains/sol` walked past all four rules: it is the
            CUSTODIAL Solana service, and one import hands the caller
            `createWallet()`, `deploySplToken()`, `mintInitialSupply()`, and
            `handleSplTokenWithdrawal()` — which decrypts the ecosystem MASTER
            WALLET and signs with it as fee payer.

            The `decrypt` rules could never have caught it. They match an import
            of `@b/utils/encrypt` and a call to `decrypt(`; sol.ts does both, but
            sol.ts is not in `files` above. The capability was one import away
            from the DEX tree and no rule in this config could see it — the exact
            failure mode the ethers comment describes, in a VM nobody had
            transposed it to.
          */
          /*
            ── THE REMAINING CHAINS, GUARDED AT THE SAME TIME THEY WERE ADDED ──
            The Solana rules below were written AFTER a red run proved the
            ruleset was walkable. These are written alongside the chains, so the
            same walk never opens: each names the custodial service or the
            key-bearing library for a VM the addon now quotes on.

            What stays ALLOWED is the read path — plain HTTP against TronGrid,
            `@ton/core`'s cell builders, and a memo string — because a guard that
            blocks reading is a guard the legitimate code routes around.
          */
          {
            name: '@b/blockchains/tron',
            message:
              'the CUSTODIAL TRON service: wallet creation, signed transfers, and a withdrawal ' +
              'path that decrypts the ecosystem master wallet. Read TronGrid over HTTP instead.'
          },
          {
            name: '@b/blockchains/ton',
            message:
              'the CUSTODIAL TON service. The DEX builds a message and TON Connect signs it in ' +
              'the user\'s own wallet.'
          },
          {
            name: 'tronweb',
            message:
              'TronWeb is constructed WITH a private key and every signing method hangs off it. ' +
              'The DEX needs no library to read TronGrid, and holds no key to sign with.'
          },
          {
            name: 'bitcoinjs-lib',
            message:
              'a UTXO swap is a PLAIN SEND the user\'s own wallet makes to a cross-chain inbound ' +
              'address. The platform never builds or signs a bitcoin transaction.'
          },
          {
            name: '@ton/crypto',
            importNames: ['mnemonicToPrivateKey', 'mnemonicToWalletKey', 'keyPairFromSeed'],
            message:
              'these derive a TON signer from a seed phrase. Cell builders and address helpers ' +
              'from @ton/core remain allowed — those encode, they do not sign.'
          },
          {
            name: '@b/blockchains/sol',
            message:
              'the CUSTODIAL Solana service: createWallet, deploySplToken, mintInitialSupply, ' +
              'and a withdrawal path that decrypts the ecosystem master wallet and signs with ' +
              'it. Read Solana through dex/utils/onchain/solana/connection.ts, which exposes a ' +
              'Connection and nothing that can sign.'
          },
          {
            name: '@b/utils/safe-imports',
            importNames: ['getSolanaService'],
            /*
              The same door with a different handle. safe-imports is a lazy
              `require` shim, so a path-based rule cannot see what it returns —
              the import that matters names this file, not sol.ts.
            */
            message:
              'the safe-imports shim returns that same custodial Solana service. A lazy require ' +
              'is still a require. Other safe-imports symbols remain allowed.'
          },
          {
            name: '@solana/web3.js',
            importNames: ['Keypair'],
            /*
              Keypair IS ethers.Wallet: whoever holds one signs. Connection,
              PublicKey, Transaction, VersionedTransaction and the instruction
              builders stay allowed — the DEX reads state and encodes messages;
              the wallet that owns the keys signs them.
            */
            message:
              'a Solana Keypair is a signer, exactly as ethers\' Wallet is. The DEX holds no key ' +
              'for any user and none for the operator. Connection, PublicKey and ' +
              'VersionedTransaction remain allowed.'
          },
          {
            name: '@solana/spl-token',
            importNames: [
              'createMint',
              'mintTo',
              'mintToChecked',
              'getOrCreateAssociatedTokenAccount'
            ],
            /*
              The SPL equivalents of ContractFactory — plus one that is easy to
              read as harmless. `getOrCreateAssociatedTokenAccount` SPENDS to
              create the account, which means some key paid for it, which means
              some key was held here. `getAssociatedTokenAddressSync` derives the
              same address with no signer and no lamports, and is what the fee-
              account flow uses.
            */
            message:
              'createMint deploys a token; getOrCreateAssociatedTokenAccount SPENDS to create ' +
              'an account, so some key paid for it. Derive with ' +
              'getAssociatedTokenAddressSync and render the creation instruction as calldata ' +
              'for the operator to sign.'
          }
        ],
        patterns: [
          {
            group: [
              '@b/services/wallet',
              '@b/services/wallet/*',
              '@b/api/(ext)/ecosystem/utils/wallet'
            ],
            message:
              'DEX amounts are uint256 and this addon is non-custodial. Only ' +
              'dex/utils/to-creditable-amount.ts may cross into the wallet service.'
          },
          {
            group: ['bip39', 'ed25519-hd-key', '@scure/bip39', '@scure/bip32'],
            message:
              'seed-phrase derivation produces private keys. The DEX imports no mnemonic ' +
              'library on any VM.'
          }
        ]
      }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value="ECO"]',
          message:
            'walletType "ECO" is forbidden in the DEX tree — createEcoWallet mints ' +
            'and persists private keys. The sweep credits SPOT.'
        },
        {
          selector: 'CallExpression[callee.name="decrypt"]',
          message:
            'the DEX never decrypts key material. If you need a signature, render ' +
            'calldata and let the operator or the user sign it from their own wallet.'
        },
        /*
          Signing and broadcasting, caught at the CALL rather than the import,
          because these arrive on objects the DEX legitimately holds. A
          `VersionedTransaction` is a value we are allowed to build — calling
          `.sign()` on it is the line, and no import rule can see that.

          `sendRawTransaction` is separated from `sendTransaction` deliberately:
          the raw form takes bytes that are ALREADY signed, so reaching it at all
          means a signature happened server-side.
        */
        {
          /*
            `Math` is excluded deliberately and it is not a nicety. This addon
            reads V3 `Swap` events, whose amounts are SIGNED int256, so
            `Math.sign()` is exactly the kind of thing someone writes here — and
            a guard that fires on legitimate arithmetic is a guard whose next
            edit is an eslint-disable comment on the line that matters.
          */
          selector:
            'CallExpression[callee.property.name=/^(sign|partialSign|addSignature|sendRawTransaction|sendAndConfirmTransaction)$/]:not([callee.object.name="Math"])',
          message:
            'signing or broadcasting a Solana transaction server-side. The platform hands out ' +
            'a serialized transaction and the wallet that owns the keys signs and sends it.'
        },
        {
          selector:
            'CallExpression[callee.property.name=/^(fromSecretKey|fromSeed|generate)$/]',
          message:
            'materialising a Solana keypair. The DEX derives addresses (PublicKey, ' +
            'getAssociatedTokenAddressSync) and never holds the key behind one.'
        }
      ]
    }
  }
];