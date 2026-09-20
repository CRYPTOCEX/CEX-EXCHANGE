#!/usr/bin/env node
/**
 * DEX/Swap architecture invariants — greps that survive an eslint-config
 * regression.
 *
 * WHY THIS EXISTS BESIDE THE ESLINT RULES RATHER THAN INSTEAD OF THEM.
 * `backend/eslint.config.mjs` forbids the same symbols with better precision:
 * it knows an import from a comment, and it names the exact binding. But it is
 * one file, and one edit to it silently removes every guard in it — including,
 * historically, guards nobody remembered were load-bearing. A grep is coarse and
 * cannot be turned off by editing a rule array, so the two together cover both
 * "somebody wrote the forbidden thing" and "somebody removed the rule that
 * forbade it".
 *
 * Every check below is a property the addon's SAFETY ARGUMENT rests on:
 *
 *   - The zero-contract rule. Every transaction a user signs targets a contract
 *     that already existed and that we did not write. That is what lets the
 *     security statement be short — a bug of ours cannot lose a user's funds,
 *     because no code of ours is in the transaction path.
 *   - Non-custody. The platform holds no key for this addon and signs nothing.
 *   - No key material. Nothing here decrypts anything.
 *
 * Exit 1 with a named violation, or exit 0 silently.
 *
 * Run: node scripts/dex-invariants.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

const TREES = [
  "backend/src/api/(ext)/dex",
  "backend/src/api/(ext)/admin/dex",
  "backend/models/ext/dex",
];

/**
 * The exemption, and there is exactly one.
 *
 * `to-creditable-amount.ts` converts a uint256 into the wallet service's 8-dp
 * Number ON PURPOSE and records the residue it drops. It carries the matching
 * eslint-disable. (The plan's own §7.5 table named this file as
 * `dex/revenue/sweep.ts`, which P5.8's DECISION had already relocated — a stale
 * path that would have exempted a file that does not exist and guarded one that
 * needed the exemption.)
 */
const EXEMPT = new Set(["backend/src/api/(ext)/dex/utils/to-creditable-amount.ts"]);

/**
 * PER-SYMBOL exemptions, and the distinction from `EXEMPT` above is the point.
 *
 * A whole-file exemption switches off EVERY rule for that file, which is far too
 * much for a file that needs one symbol. Each entry below names the one label it
 * releases; every other forbidden symbol still fails in the same file.
 *
 * `admin/dex/pool/utils.ts` reads `ecosystemMasterWallet` TO REFUSE — it lists
 * the treasury's public addresses so a seeding wallet matching one can be turned
 * away. That is the inverse of the hazard the rule guards: the rule exists to
 * stop the DEX SPENDING from the master wallet, and this is the check that
 * enforces it. Reading a public address list is not a capability; `decrypt(`,
 * `Wallet` and `ContractFactory` remain errors in this exact file.
 */
const EXEMPT_SYMBOL = new Map([
  [
    "backend/src/api/(ext)/admin/dex/pool/utils.ts",
    new Set(["ecosystemMasterWallet"]),
  ],
  /*
    THE ONE SANCTIONED CUSTODIAL TOUCH IN THE ADDON.

    The fee sweep credits the Super Admin's SPOT wallet with revenue already
    collected on-chain — platform income, not user funds, and no leg of any
    user's swap passes through it. It reaches the helper through a dynamic
    `await import(...)`, which is exactly why it needs naming here: a symbol
    search over the tree does not see it, so "no custodial call in the DEX"
    was true for the wrong reason.

    Listing it makes the exception explicit and bounds it: this file may, and
    nothing else may.
  */
  [
    "backend/src/api/(ext)/dex/utils/cron.ts",
    new Set(["walletService", "collectPlatformFee"]),
  ],
]);

const FORBIDDEN = [
  {
    pattern: /\bwalletService\s*\./,
    label: "walletService",
    why:
      "a swap is NON-CUSTODIAL: the user signs from their own wallet and no leg " +
      "of it touches a platform balance. That claim was true only by accident — " +
      "nothing enforced it, and the one place custodial money IS credited " +
      "(the fee sweep) reaches it through a dynamic import, which no symbol " +
      "search would have found. Both are pinned now.",
  },
  {
    pattern: /\bcollectPlatformFee\s*\(/,
    label: "collectPlatformFee",
    why:
      "it credits the Super Admin's custodial SPOT wallet with swept fee " +
      "revenue. That is PLATFORM revenue rather than user funds and is " +
      "legitimate — but it is the single sanctioned custodial touch in this " +
      "addon, so it is confined to the sweep in utils/cron.ts. A second caller " +
      "appearing anywhere else is the thing worth being told about.",
  },
  {
    pattern: /\bContractFactory\b/,
    label: "ContractFactory",
    why:
      "the DEX deploys nothing. A pool is deployed by the third-party factory; " +
      "creation and seeding are calldata the operator signs from their own wallet.",
  },
  {
    pattern: /\bdeployTokenContract\b/,
    label: "deployTokenContract",
    why:
      "it decrypts the ecosystem master wallet and signs an ERC20 deployment with it. " +
      "That key is the CUSTODIAL treasury.",
  },
  {
    pattern: /\bgetSmartContract\b/,
    label: "getSmartContract",
    why:
      "it loads ABI+BYTECODE for deployment and throws without both. Use " +
      "dex/utils/onchain/abis.ts — we have no bytecode because we deploy nothing.",
  },
  {
    pattern: /\becosystemMasterWallet\b/,
    label: "ecosystemMasterWallet",
    why:
      "seeding a pool from the custodial treasury would move customer-backing capital " +
      "into an impermanent-loss position. It is the one outcome this design exists to prevent.",
  },
  {
    /*
      ── THE SAME BOUNDARY, ON THE REMAINING CHAINS ───────────────────────────
      Each of these is the custodial service or the key-bearing symbol for a VM
      the addon now quotes on, and each was reachable from this tree the moment
      that VM was added.

      `@b/blockchains/tron` is the ecosystem's custodial TRON service. Same shape
      as `blockchains/sol`: one import and the caller can create a wallet, sign a
      transfer, and reach the decrypted master key. The Solana rule below it was
      added AFTER a red run proved the ruleset was walkable; these are added at
      the same time as the chains, so the walk never opens.
    */
    pattern: /blockchains\/(tron|ton|xmr)\b/,
    label: "@b/blockchains/{tron,ton,xmr}",
    why:
      "the CUSTODIAL services for those chains: wallet creation, signed transfers, and a " +
      "withdrawal path that decrypts the ecosystem master wallet. The DEX reads and encodes only.",
  },
  {
    /*
      TronWeb's default export carries a private key on construction —
      `new TronWeb({ privateKey })` — and every signing method hangs off it. The
      DEX reads TRON through plain HTTP against TronGrid, which needs no library
      and cannot hold a key.
    */
    pattern: /\bTronWeb\b/,
    label: "TronWeb",
    why:
      "TronWeb is constructed WITH a private key and signs from it. Read TronGrid over HTTP; " +
      "the user's TronLink signs what we render.",
  },
  {
    /*
      TON's key material. `mnemonicToPrivateKey` and `KeyPair` are the ton-crypto
      symbols that turn a seed phrase into a signer; `WalletContractV4.create`
      plus `.sender(key)` is the pair that signs. None of it belongs here — a TON
      swap is a message the server builds and TON Connect signs.
    */
    pattern: /\b(mnemonicToPrivateKey|mnemonicToWalletKey|WalletContractV[0-9])\b/,
    label: "TON key derivation",
    why:
      "these derive a TON signer from a seed phrase. The DEX builds the message; TON Connect " +
      "signs it in the user's own wallet.",
  },
  {
    /*
      The UTXO chains have no VM, so there is nothing to call — which means the
      ONLY way this tree could touch them is by holding a key and signing a
      transfer. `bitcoinjs-lib`'s Psbt and ECPair are exactly that.
    */
    pattern: /\b(bitcoinjs-lib|ECPair|Psbt)\b/,
    label: "bitcoin signing",
    why:
      "a UTXO swap is a PLAIN SEND the user's own wallet makes to a cross-chain inbound " +
      "address. The platform never builds or signs a bitcoin transaction.",
  },
  {
    /*
      THE ONE-IMPORT BYPASS, and it defeated every other rule in this file.

      `@b/blockchains/sol` is the CUSTODIAL Solana service. One import hands the
      caller `createWallet()`, `handleSplTokenWithdrawal()` — which decrypts the
      ecosystem MASTER WALLET and signs with it as fee payer — `deploySplToken()`
      and `mintInitialSupply()`. Every capability the rules above forbid, reachable
      in one line.

      And `decrypt(` below CANNOT SEE IT: those decrypt calls live inside sol.ts,
      outside the trees this script scans. So the guard's own headline invariant
      was walkable without tripping a single pattern — the exact shape the eslint
      config already warns about for ethers ("the capability is one import away"),
      transposed to Solana and never transposed to the guard.
    */
    pattern: /blockchains\/sol\b/,
    label: "@b/blockchains/sol",
    why:
      "it is the CUSTODIAL Solana service: createWallet, deploySplToken, mintInitialSupply, " +
      "and a withdrawal path that decrypts the ecosystem master wallet and signs with it.",
  },
  {
    /*
      The same door with a different handle. `safe-imports` is a lazy-require
      shim, so this one is invisible to a path-based import rule and to the
      pattern above whenever it is written as `getSolanaService()`.
    */
    pattern: /\bgetSolanaService\b/,
    label: "getSolanaService",
    why:
      "the safe-imports shim returns that same custodial Solana service. A lazy require is " +
      "still a require, and this one is invisible to a path-based rule.",
  },
  {
    /*
      Solana's `Keypair` is `ethers.Wallet`: whoever holds one signs. The DEX
      reads and encodes; the USER or the OPERATOR signs, from their own wallet.
    */
    pattern: /\bKeypair\b/,
    label: "Keypair",
    why:
      "a Solana Keypair IS a signer, exactly as ethers' Wallet is. The DEX holds no key for " +
      "any user and none for the operator.",
  },
  {
    /*
      The SPL equivalents of ContractFactory. `createMint` deploys a token, and
      `getOrCreateAssociatedTokenAccount` SPENDS to create an account — which
      means some key paid for it.
    */
    pattern: /\b(createMint|mintTo|getOrCreateAssociatedTokenAccount)\b/,
    label: "SPL mint/ATA creation",
    why:
      "createMint deploys a token and getOrCreateAssociatedTokenAccount spends to create an " +
      "account. The DEX deploys nothing and pays for nothing on anybody's behalf.",
  },
  {
    pattern: /\.(partialSign|sendRawTransaction|fromSecretKey|fromSeed)\s*\(/,
    label: "Solana signing/sending",
    why:
      "signing or broadcasting a Solana transaction server-side. The platform hands out a " +
      "serialized transaction and the wallet that owns the keys signs it.",
  },
  {
    pattern: /\bdecrypt\s*\(/,
    label: "decrypt(",
    why:
      "the DEX never decrypts key material. Every transaction is signed by the user's " +
      "or the operator's own wallet.",
  },
  {
    /*
      ── THE IN-HOUSE WALLET'S OWN BOUNDARY ───────────────────────────────────
      SCOPED, and it is the first rule here that is. Everything above forbids a
      symbol across the whole addon; this one forbids a VOCABULARY inside one
      subtree, because that subtree is the only place where the temptation is
      structural.

      `dex/wallet/**` stores an encrypted envelope produced in the user's
      browser. Its entire security argument is that the server has no way to
      open it — not "does not", HAS NO WAY. Every symbol below is a step toward
      having one: a KDF, a cipher, an HD derivation, or a field name that only
      makes sense if a key is in scope. None of them can appear without somebody
      having decided to make this custodial, and the point of a grep is that the
      decision then has to be made in this file, in front of this comment.

      Deliberately NOT in the pattern: the STRING "PBKDF2-SHA512" and the words
      "recovery phrase". The first is the algorithm name the shape validator has
      to compare against, and the second appears in user-facing copy on the
      delete and backup routes — which is exactly where it should appear.
    */
    scope: /^backend\/src\/api\/\(ext\)\/(dex\/wallet|admin\/dex\/user-wallet)\//,
    pattern:
      /\b(createDecipheriv|createCipheriv|pbkdf2Sync|scryptSync|mnemonicToSeed|HDKey|derivePath|privateKey|secretKey)\b|crypto\.subtle/,
    label: "wallet key material",
    why:
      "the wallet routes store an OPAQUE envelope. A KDF, a cipher, an HD derivation or a " +
      "privateKey field in that tree means the server has started to be able to open it, " +
      "which is the one property the in-house wallet's security rests on.",
  },
  {
    // The literal, not the identifier: `walletType: "ECO"` mints and persists a
    // private key per active token via createEcoWallet.
    pattern: /["']ECO["']/,
    label: '"ECO" wallet type',
    why:
      "createEcoWallet MINTS AND PERSISTS PRIVATE KEYS per active token. The DEX sweep " +
      "credits SPOT.",
  },
];

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SELF-TEST — proof that each rule above actually fires.
 *
 * A grep guard has a failure mode a green run cannot distinguish from success:
 * the regex is wrong, matches nothing, and the tree is "clean" forever. That is
 * not hypothetical here — the SVM rules were added precisely BECAUSE the ruleset
 * was silently walkable, and a rule that never matches is the same defect
 * wearing a different hat.
 *
 * So every rule carries a `trips` string it must match and a `passes` string it
 * must not, and `--self-test` asserts both. The completeness check underneath is
 * the part that matters most: a rule with no fixture FAILS. Adding a forbidden
 * symbol without demonstrating it fires is not possible from here on.
 *
 * `--self-test` runs the fixtures INSTEAD of the tree. That is not an escape
 * hatch: the gate (`scripts/gate.mjs`) invokes this script with no arguments,
 * and `custody-guard.test.ts` asserts it still does — so weakening a real run
 * would take an edit to the gate that a test fails on.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const SELF_TEST_FIXTURES = {
  walletService: {
    trips: 'await walletService.credit(userId, "USDT", amount);',
    // Prose naming it is documentation, not a call: the model files carry
    // exactly this shape in their Sequelize column comments.
    passes: 'the walletService credit is not part of any swap leg',
  },
  collectPlatformFee: {
    trips: 'await collectPlatformFee({ currency, amount, reference });',
    passes: 'collectPlatformFee returns null on failure rather than throwing',
  },
  ContractFactory: {
    trips: 'const f = new ContractFactory(abi, bytecode, signer);',
    passes: 'import { Contract, Interface, JsonRpcProvider } from "ethers";',
  },
  deployTokenContract: {
    trips: 'const addr = await deployTokenContract(chain, name, symbol);',
    passes: 'const addr = pool.poolAddress;',
  },
  getSmartContract: {
    trips: 'const { abi } = await getSmartContract("ETH", "UniswapV2Pair");',
    passes: 'import { PAIR_ABI } from "./onchain/abis";',
  },
  ecosystemMasterWallet: {
    trips: 'const w = await models.ecosystemMasterWallet.findOne({ where: { chain } });',
    passes: 'const w = await models.dexWalletLink.findOne({ where: { userId } });',
  },
  "@b/blockchains/sol": {
    trips: 'import { createWallet } from "@b/blockchains/sol";',
    // The near miss that must NOT trip: a chain slug, not the service module.
    passes: 'const slug = "solana"; const path = "dex/utils/onchain/solana/connection";',
  },
  getSolanaService: {
    trips: 'const svc = await getSolanaService();',
    passes: 'const { getEcosystemChainUtils } = await import("@b/utils/safe-imports");',
  },
  Keypair: {
    trips: 'const signer = Keypair.fromSecretKey(bytes);',
    passes: 'import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";',
  },
  "SPL mint/ATA creation": {
    trips: 'const ata = await getOrCreateAssociatedTokenAccount(conn, payer, mint, owner);',
    // The read-only derivation the fee-account flow actually uses. If this ever
    // starts tripping, the rule has become a blocker instead of a guard.
    passes: 'const ata = getAssociatedTokenAddressSync(mint, owner, true);',
  },
  "Solana signing/sending": {
    trips: 'await connection.sendRawTransaction(signed.serialize());',
    passes: 'const sim = await connection.simulateTransaction(tx);',
  },
  "@b/blockchains/{tron,ton,xmr}": {
    trips: 'import { createWallet } from "@b/blockchains/tron";',
    // The near miss: a chain slug and our own read-only module path.
    passes: 'const slug = "tron"; import { tronGet } from "./onchain/tron/client";',
  },
  TronWeb: {
    trips: 'const tw = new TronWeb({ fullHost, privateKey });',
    passes: 'const res = await tronGet("/wallet/getnowblock");',
  },
  "TON key derivation": {
    trips: 'const key = await mnemonicToPrivateKey(words);',
    passes: 'const cell = beginCell().storeUint(op, 32).endCell();',
  },
  "bitcoin signing": {
    trips: 'const psbt = new Psbt({ network });',
    passes: 'const memo = `=:BTC.BTC:${destination}:${limit}`;',
  },
  '"ECO" wallet type': {
    trips: 'await createWallet(userId, "ECO", currency);',
    passes: 'await creditSpot(userId, currency, amount);',
  },
  "decrypt(": {
    trips: 'const key = decrypt(wallet.data);',
    passes: 'const facts = JSON.parse(pool.data);',
  },
  "wallet key material": {
    trips: 'const seed = mnemonicToSeed(words); const node = HDKey.fromMasterSeed(seed);',
    // The near miss that must stay legal: the shape validator comparing the
    // algorithm NAME, and the delete route's user-facing copy. Both are the
    // vocabulary of refusing to decrypt, not of decrypting.
    passes:
      'if (envelope.kdf?.name !== "PBKDF2-SHA512") throw bad("Unsupported key derivation.");',
  },
};

if (process.argv.includes("--self-test")) {
  const failures = [];

  for (const rule of FORBIDDEN) {
    const fixture = SELF_TEST_FIXTURES[rule.label];
    if (!fixture) {
      failures.push(
        `${rule.label}: NO FIXTURE. Every forbidden symbol must carry a string that trips it ` +
          "and one that does not — otherwise a regex that matches nothing looks identical to a clean tree."
      );
      continue;
    }
    if (!rule.pattern.test(stripComments(fixture.trips))) {
      failures.push(
        `${rule.label}: does NOT match its own violating fixture. The rule is inert — ` +
          `the tree has been passing this check without it.\n      fixture: ${fixture.trips}`
      );
    }
    if (rule.pattern.test(stripComments(fixture.passes))) {
      failures.push(
        `${rule.label}: matches its ALLOWED fixture, so it forbids something legitimate.\n` +
          `      fixture: ${fixture.passes}`
      );
    }
  }

  // A comment naming a forbidden symbol must stay legal, or this file's own
  // documentation could not live in the tree it documents.
  for (const rule of FORBIDDEN) {
    const fixture = SELF_TEST_FIXTURES[rule.label];
    if (!fixture) continue;
    if (rule.pattern.test(stripComments(`// ${fixture.trips}`))) {
      failures.push(`${rule.label}: fires on a COMMENT. stripComments is not being applied.`);
    }
  }

  const orphans = Object.keys(SELF_TEST_FIXTURES).filter(
    (label) => !FORBIDDEN.some((r) => r.label === label)
  );
  for (const label of orphans) {
    failures.push(`${label}: fixture for a rule that no longer exists. A guard was removed.`);
  }

  if (failures.length) {
    console.error("dex-invariants --self-test: FAILED\n");
    for (const f of failures) console.error(`  ${f}\n`);
    process.exit(1);
  }

  console.log(
    `dex-invariants --self-test: OK (${FORBIDDEN.length} rules, each proven to fire on a ` +
      "violation, stay silent on the legitimate near-miss, and ignore a comment)"
  );
  process.exit(0);
}

const violations = [];
let filesScanned = 0;
let solidityFound = [];

for (const tree of TREES) {
  const abs = join(ROOT, tree);
  let entries;
  try {
    entries = walk(abs);
  } catch {
    // A tree that does not exist is not a violation — this script runs on
    // installs that have never had the addon.
    continue;
  }
  for (const file of entries) {
    const rel = relative(ROOT, file).split(sep).join("/");

    // The zero-contract rule, checked structurally rather than by grep: a `.sol`
    // file anywhere in this tree means somebody started writing a contract.
    if (rel.endsWith(".sol")) {
      solidityFound.push(rel);
      continue;
    }
    if (!/\.(ts|tsx|mjs|js)$/.test(rel)) continue;
    if (EXEMPT.has(rel)) continue;

    filesScanned++;
    const source = readFileSync(file, "utf8");
    for (const rule of FORBIDDEN) {
      /*
        A SCOPED rule applies only inside the subtree it names. Unscoped rules —
        every one but the wallet vocabulary — apply to the whole addon, which is
        why the check is an opt-out rather than an opt-in: a new rule with no
        `scope` guards everything, which is the safer default to forget.
      */
      if (rule.scope && !rule.scope.test(rel)) continue;
      if (!rule.pattern.test(source)) continue;
      /*
        A match inside a comment is not a violation — this file's own guards are
        DOCUMENTED in the tree they guard, and the eslint config forbids the real
        thing with syntactic precision. Stripping comments before matching is
        what keeps that documentation from failing the gate it describes.
      */
      if (!rule.pattern.test(stripComments(source))) continue;
      if (EXEMPT_SYMBOL.get(rel)?.has(rule.label)) continue;
      violations.push({ file: rel, label: rule.label, why: rule.why });
    }
  }
}

/*
  VACUITY GUARD. A grep suite that scans zero files passes, loudly and
  meaninglessly — which is exactly what happens after a directory rename. The
  floor is deliberately well below the real count so an ordinary refactor does
  not trip it, and well above zero so a broken path does.
*/
const MIN_FILES = 20;
if (filesScanned < MIN_FILES) {
  console.error(
    `dex-invariants: only ${filesScanned} files scanned, expected at least ${MIN_FILES}.\n` +
      "The DEX tree has moved or this script's paths are stale. A grep suite that scans " +
      "nothing passes without checking anything, so this is a failure, not a skip."
  );
  process.exit(1);
}

if (solidityFound.length) {
  console.error(
    "dex-invariants: Solidity source found in the DEX tree.\n" +
      solidityFound.map((f) => `  ${f}`).join("\n") +
      "\n\nThe zero-contract rule is load-bearing, not a preference: the router allowlist is " +
      "meaningful only because every entry is a third party's audited contract, and approvals " +
      "default to exact-per-swap because we have nothing to pause."
  );
  process.exit(1);
}

if (violations.length) {
  console.error("dex-invariants: forbidden symbols in the DEX tree.\n");
  for (const v of violations) {
    console.error(`  ${v.file}\n    ${v.label} — ${v.why}\n`);
  }
  process.exit(1);
}

console.log(
  `dex-invariants: OK (${filesScanned} files, ${FORBIDDEN.length} forbidden symbols, no Solidity)`
);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

/**
 * Block and line comments removed. Deliberately naive — it does not understand
 * a `//` inside a string literal — and that bias is the safe one: it can only
 * remove MORE than it should, which risks a missed violation, never a false one
 * that blocks a release over a comment. The eslint rule is the precise half.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}
