/**
 * Safe .env manager for managed hosting.
 *
 * Reads/writes the platform's root .env the SAFE way — targeted line replace
 * that preserves comments, section headers, ordering and quoting — instead of
 * round-tripping through dotenv.parse()->serialize (which strips all of that).
 * Modeled on scripts/kms/generate.mjs.
 *
 * Hard rules:
 *  - ENCRYPTED_ENCRYPTION_KEY and ENCRYPTION_KEY_PASSPHRASE can NEVER be edited
 *    here — altering them permanently bricks every encrypted wallet.
 *  - Secret-looking keys are REDACTED on read (the panel shows set/unset only).
 *  - Every write snapshots a timestamped .env.bak and writes atomically
 *    (temp file + rename).
 *  - `set --restart` restarts the backend, health-checks it, and AUTO-ROLLS-BACK
 *    to the snapshot if the process does not come back healthy.
 *
 * Usage:
 *   node scripts/env-manager.mjs get [--json]
 *   node scripts/env-manager.mjs set KEY=VALUE [KEY2=VALUE2 ...] [--restart]
 *
 * Testing: set ENV_MANAGER_FILE to point at a throwaway .env.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { createRequire } from "module";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");
const ENV_PATH = process.env.ENV_MANAGER_FILE || path.join(ROOT, ".env");

// Restart via the graceful-drain path (waits for in-flight withdrawals) instead
// of a blind stop, then starts back up.
const RESTART_CMD = "node backend/scripts/graceful-stop.mjs && pnpm start";

// Keys that must never be edited via this tool (data-loss / wallet-bricking).
const DENYLIST = new Set([
  "ENCRYPTED_ENCRYPTION_KEY",
  "ENCRYPTION_KEY_PASSPHRASE",
]);

// Keys whose values are redacted on read (shown as set/unset only).
const SECRET_RE =
  /(SECRET|PASSWORD|PASSPHRASE|PRIVATE|MNEMONIC|SEED|_KEY$|API_KEY|APIKEY|TOKEN|CLIENT_ID|CLIENT_SECRET|WEBHOOK|SIGNING|AUTH_TOKEN|SID|DSN|CREDENTIAL)/i;

// Flags that live in BOTH .env and the DB `settings` table (read with
// OR-precedence by the backend). Editing only .env leaves the DB copy stale, so
// we mirror these into the settings table too. NOTE: only well-known,
// same-semantics, non-security-critical flags are listed. 2FA (env
// NEXT_PUBLIC_2FA_*_STATUS ↔ DB twoFactor* keys) is deliberately NOT mirrored
// here — its DB key mapping must be verified against the running backend first
// to avoid a 2FA lockout.
const SHARED_KEY_MAP = {
  NEXT_PUBLIC_DEMO_STATUS: ["NEXT_PUBLIC_DEMO_STATUS", "DEMO_STATUS"],
};

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
// Matches:  KEY=...   or   export KEY=...   (captures the key name)
const LINE_KEY_RE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;

function isSecretKey(key) {
  return DENYLIST.has(key) || SECRET_RE.test(key);
}

function readEnv() {
  if (!fs.existsSync(ENV_PATH)) return "";
  return fs.readFileSync(ENV_PATH, "utf8");
}

/** Parse into ordered {key,value} pairs (comments/blanks ignored for listing). */
function parsePairs(text) {
  const pairs = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const m = rawLine.match(LINE_KEY_RE);
    if (!m) continue;
    const key = m[1];
    let value = rawLine.slice(rawLine.indexOf("=") + 1).trim();
    // Strip surrounding quotes for display.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    pairs.push({ key, value });
  }
  return pairs;
}

/** Quote a value only when needed so dotenv parses it back verbatim. */
function formatValue(value) {
  const needsQuote =
    value === "" ||
    /[\s#"'\\$]/.test(value) ||
    value !== value.trim();
  if (!needsQuote) return value;
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function cmdGet(asJson) {
  const pairs = parsePairs(readEnv());
  const out = pairs.map(({ key, value }) => {
    const secret = isSecretKey(key);
    return {
      key,
      secret,
      editable: !DENYLIST.has(key),
      isSet: value.length > 0,
      // Never emit secret values off-box.
      value: secret ? "" : value,
    };
  });
  if (asJson) {
    process.stdout.write(JSON.stringify({ ok: true, keys: out }) + "\n");
  } else {
    for (const k of out) {
      const shown = k.secret ? (k.isSet ? "<set>" : "<unset>") : k.value;
      console.log(`${k.editable ? " " : "🔒"} ${k.key}=${shown}`);
    }
  }
}

/** Replace the first matching KEY= line, or append if absent. Preserves the rest. */
function applyPair(text, key, value) {
  const lines = text.split(/\r?\n/);
  const formatted = `${key}=${formatValue(value)}`;
  let replaced = false;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(LINE_KEY_RE);
    if (m && m[1] === key) {
      lines[i] = formatted;
      replaced = true;
      break;
    }
  }
  if (!replaced) {
    // Append, ensuring exactly one trailing newline separation.
    if (lines.length && lines[lines.length - 1] === "") lines.pop();
    lines.push(formatted);
    lines.push("");
  }
  return lines.join("\n");
}

function backendHealthy(timeoutMs = 2000) {
  const port = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
  return new Promise((resolve) => {
    const req = http.get(
      { host: "127.0.0.1", port, path: "/api/health", timeout: timeoutMs },
      (res) => {
        res.resume();
        resolve(res.statusCode > 0 && res.statusCode < 500);
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

/** Best-effort mirror of shared flags into the DB `settings` table. */
async function mirrorSharedToDb(changed) {
  const rows = [];
  for (const p of changed) {
    const targets = SHARED_KEY_MAP[p.key];
    if (targets) for (const t of targets) rows.push([t, p.value]);
  }
  if (rows.length === 0) return;
  try {
    const require = createRequire(import.meta.url);
    const { Sequelize, QueryTypes } = require(path.join(ROOT, "backend/node_modules/sequelize"));
    const env = Object.fromEntries(parsePairs(readEnv()).map((p) => [p.key, p.value]));
    const seq = new Sequelize(
      env.DB_NAME || "platform",
      env.DB_USER || "root",
      env.DB_PASSWORD || "",
      { host: env.DB_HOST || "localhost", port: parseInt(env.DB_PORT || "3306", 10), dialect: "mysql", logging: false },
    );
    for (const [k, v] of rows) {
      await seq.query(
        "INSERT INTO `settings` (`key`,`value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)",
        { replacements: [k, v], type: QueryTypes.INSERT },
      );
    }
    await seq.close();
    console.error(`[env-manager] mirrored ${rows.length} shared flag(s) to DB settings.`);
  } catch (e) {
    console.error("[env-manager] shared-flag DB mirror skipped: " + e.message);
  }
}

async function cmdSet(pairs, doRestart) {
  const parsed = [];
  for (const p of pairs) {
    const eq = p.indexOf("=");
    if (eq < 0) throw new Error(`Malformed KEY=VALUE argument: ${p}`);
    const key = p.slice(0, eq).trim();
    const value = p.slice(eq + 1);
    if (!KEY_RE.test(key)) throw new Error(`Invalid env key: ${key}`);
    if (DENYLIST.has(key)) {
      throw new Error(
        `Refusing to edit ${key} — changing it permanently bricks all encrypted wallets.`
      );
    }
    if (/\r|\n/.test(value)) throw new Error(`Value for ${key} contains a newline.`);
    parsed.push({ key, value });
  }

  const original = readEnv();
  let next = original;
  for (const { key, value } of parsed) next = applyPair(next, key, value);

  // Snapshot + atomic write.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const bakPath = `${ENV_PATH}.bak-${stamp}`;
  if (original) fs.writeFileSync(bakPath, original, "utf8");
  const tmpPath = `${ENV_PATH}.tmp-${Math.random().toString(36).slice(2)}`;
  fs.writeFileSync(tmpPath, next, "utf8");
  fs.renameSync(tmpPath, ENV_PATH);

  // Keep the DB copy of any shared flags in sync with the .env we just wrote.
  await mirrorSharedToDb(parsed);

  const result = {
    ok: true,
    changed: parsed.map((p) => p.key),
    backup: original ? bakPath : null,
    restarted: false,
    rolledBack: false,
  };

  if (doRestart) {
    try {
      execSync(RESTART_CMD, { cwd: ROOT, stdio: "inherit" });
      // Give the backend a moment, then health-check with retries.
      let healthy = false;
      for (let i = 0; i < 30 && !healthy; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        healthy = await backendHealthy();
      }
      result.restarted = true;
      if (!healthy) {
        // Auto-rollback to the snapshot and restart again.
        if (original) {
          fs.writeFileSync(ENV_PATH, original, "utf8");
          execSync(RESTART_CMD, { cwd: ROOT, stdio: "inherit" });
        }
        result.ok = false;
        result.rolledBack = true;
        result.error = "Backend did not become healthy — rolled back .env.";
      }
    } catch (e) {
      if (original) {
        fs.writeFileSync(ENV_PATH, original, "utf8");
        try {
          execSync(RESTART_CMD, { cwd: ROOT, stdio: "inherit" });
        } catch {}
      }
      result.ok = false;
      result.rolledBack = true;
      result.error = `Restart failed: ${e.message} — rolled back .env.`;
    }
  }

  process.stdout.write(JSON.stringify(result) + "\n");
  if (!result.ok) process.exit(1);
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const flags = new Set(rest.filter((a) => a.startsWith("--")));
  const args = rest.filter((a) => !a.startsWith("--"));

  if (cmd === "get") {
    cmdGet(flags.has("--json"));
  } else if (cmd === "set") {
    if (!args.length) throw new Error("Usage: env-manager.mjs set KEY=VALUE ...");
    await cmdSet(args, flags.has("--restart"));
  } else {
    console.error(
      "Usage:\n  env-manager.mjs get [--json]\n  env-manager.mjs set KEY=VALUE [...] [--restart]"
    );
    process.exit(2);
  }
}

main().catch((e) => {
  process.stdout.write(JSON.stringify({ ok: false, error: e.message }) + "\n");
  process.exit(1);
});
