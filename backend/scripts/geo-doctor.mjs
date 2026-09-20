/**
 * Geo Restriction Doctor — diagnose and repair a geo lockout
 *
 * FOR THE SITUATION WHERE THE ADMIN PANEL IS THE THING THAT IS BLOCKED.
 *
 * The geographic restriction feature can be configured into a state where it
 * refuses every request on the platform — most commonly by switching on "block
 * when the country cannot be determined" on an install that has no way to
 * determine anyone's country (no CDN country header, no IP lookup provider, or
 * a reverse proxy hiding every visitor's real address). The country rules are
 * never even consulted. Everyone sees a compliance notice, including the
 * operator, and because that notice looks exactly like the feature working
 * correctly, nobody thinks to suspect a misconfiguration.
 *
 * This script talks straight to the database, so it works when nothing else
 * does: no backend boot, no login, no HTTP, no admin session.
 *
 *   Diagnose (read-only, the default):
 *     node scripts/geo-doctor.mjs
 *
 *   Repair the minimum needed to make the platform reachable again:
 *     node scripts/geo-doctor.mjs --fix
 *
 *   Switch geographic restrictions off entirely:
 *     node scripts/geo-doctor.mjs --disable
 *
 *   Add a permanent escape hatch for your own address:
 *     node scripts/geo-doctor.mjs --allow-ip 203.0.113.4 --fix
 *
 * NO RESTART REQUIRED — but only because this script goes out of its way to
 * earn that. Editing the rows by hand in a SQL client appears to do nothing at
 * all, and sends people looking for a second fault, because TWO caches sit in
 * front of the table and a plain UPDATE defeats both:
 *
 *   1. Each process holds the settings in memory. It polls the `__cacheVersion`
 *      row to notice an outside change — but that poll is skipped entirely
 *      while Redis pub/sub is up (see revalidateIfStale), because the poll only
 *      exists as a fallback for when it is down. On a healthy install a bumped
 *      stamp is therefore inert on its own.
 *   2. The shared Redis hash `settings` has NO expiry. An emptied in-memory Map
 *      refills from that hash and only falls through to the database when the
 *      hash is empty — so even a full restart re-serves the stale values.
 *
 * So a repair has to do three things, in this order: write the rows, DROP the
 * Redis hash, then announce the invalidation. Dropping before announcing is not
 * cosmetic — the invalidation handler only CLEARS each process's Map, so a
 * process told to reload while the stale hash still exists reloads straight out
 * of it. When Redis cannot be reached the script says so and tells the operator
 * exactly what to run by hand instead of claiming a fix that has not landed.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const valueOf = (flag) => {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--")
    ? argv[i + 1]
    : null;
};

const FIX = has("--fix");
const DISABLE = has("--disable");
const ALLOW_IP = valueOf("--allow-ip");
const WRITING = FIX || DISABLE || (ALLOW_IP && FIX);

const CACHE_VERSION_KEY = "__cacheVersion";

/** Mirrors utils/cache.ts — the shared hash and the channel that drops it. */
const SETTINGS_HASH_KEY = "settings";
const CACHE_INVALIDATE_CHANNEL = "cache:invalidate";

const K = {
  enabled: "geoRestrictionEnabled",
  mode: "geoRestrictionMode",
  allowAccountExit: "geoRestrictionAllowAccountExit",
  blockUnknownCountry: "geoRestrictionBlockUnknownCountry",
  failOpen: "geoRestrictionFailOpen",
  adminBypass: "geoRestrictionAdminBypass",
  ipAllowlist: "geoRestrictionIpAllowlist",
  ipBlocklist: "geoRestrictionIpBlocklist",
  lookupProvider: "geoRestrictionLookupProvider",
  lookupApiKey: "geoRestrictionLookupApiKey",
  trustCdnHeaders: "geoRestrictionTrustCdnHeaders",
  blockAnonymizedIps: "geoRestrictionBlockAnonymizedIps",
};

/** Mirrors utils/geo/settings.ts — an unrecognised value falls back, not to false. */
const DEFAULTS = {
  [K.enabled]: false,
  [K.mode]: "BLOCKLIST",
  [K.allowAccountExit]: true,
  [K.blockUnknownCountry]: false,
  [K.failOpen]: true,
  [K.adminBypass]: true,
  [K.trustCdnHeaders]: true,
  [K.blockAnonymizedIps]: false,
  [K.lookupProvider]: "NONE",
};

const sequelize = new Sequelize(
  process.env.DB_NAME || "platform",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    dialect: "mysql",
    logging: false,
  }
);

const bar = (ch = "=") => ch.repeat(74);
const say = (...a) => console.log(...a);

function toBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const s = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(s)) return true;
  if (["false", "0", "no", "off"].includes(s)) return false;
  return fallback;
}

function parseIpList(value) {
  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(/[\s,;]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

async function readSettings() {
  const rows = await sequelize.query(
    "SELECT `key`, `value` FROM `settings` WHERE `key` LIKE 'geoRestriction%'",
    { type: QueryTypes.SELECT }
  );
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    raw: map,
    enabled: toBool(map.get(K.enabled), DEFAULTS[K.enabled]),
    mode: (map.get(K.mode) || DEFAULTS[K.mode]).toUpperCase(),
    allowAccountExit: toBool(map.get(K.allowAccountExit), DEFAULTS[K.allowAccountExit]),
    blockUnknownCountry: toBool(
      map.get(K.blockUnknownCountry),
      DEFAULTS[K.blockUnknownCountry]
    ),
    failOpen: toBool(map.get(K.failOpen), DEFAULTS[K.failOpen]),
    adminBypass: toBool(map.get(K.adminBypass), DEFAULTS[K.adminBypass]),
    trustCdnHeaders: toBool(map.get(K.trustCdnHeaders), DEFAULTS[K.trustCdnHeaders]),
    blockAnonymizedIps: toBool(
      map.get(K.blockAnonymizedIps),
      DEFAULTS[K.blockAnonymizedIps]
    ),
    lookupProvider: (map.get(K.lookupProvider) || DEFAULTS[K.lookupProvider]).toUpperCase(),
    lookupApiKey: map.get(K.lookupApiKey) || "",
    ipAllowlist: parseIpList(map.get(K.ipAllowlist)),
    ipBlocklist: parseIpList(map.get(K.ipBlocklist)),
  };
}

async function readRules() {
  const [table] = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'geo_restriction'`,
    { replacements: [sequelize.config.database], type: QueryTypes.SELECT }
  );
  if (!table) return null;
  return sequelize.query(
    "SELECT id, countryCode, countryName, type, scope, status, effectiveFrom, effectiveTo " +
      "FROM `geo_restriction` WHERE status = 1",
    { type: QueryTypes.SELECT }
  );
}

/**
 * Recent refusals, straight from the evidence log.
 *
 * This is what turns "your configuration looks risky" into "your configuration
 * has refused 14,208 requests in the last hour and not one of them resolved to
 * a country" — the difference between a warning an operator argues with and a
 * fact they act on.
 */
async function readRecentBlocks() {
  const [table] = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'geo_access_log'`,
    { replacements: [sequelize.config.database], type: QueryTypes.SELECT }
  );
  if (!table) return null;
  return sequelize.query(
    "SELECT reasonCode, COUNT(*) AS entries, SUM(hitCount) AS hits, " +
      "       SUM(countryCode IS NOT NULL) AS withCountry, MAX(createdAt) AS lastSeen " +
      "  FROM `geo_access_log` " +
      " WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR) " +
      " GROUP BY reasonCode ORDER BY hits DESC",
    { type: QueryTypes.SELECT }
  );
}

/**
 * Every way this configuration can be refusing people, worst first.
 *
 * `fatal` means "this refuses one hundred percent of requests" — not most, not
 * the restricted countries, everyone. Those are what --fix repairs.
 */
function diagnose(s, rules, blockStats) {
  const problems = [];
  const notes = [];

  const now = Date.now();
  const inForce = (rules ?? []).filter((r) => {
    const from = r.effectiveFrom ? new Date(r.effectiveFrom).getTime() : null;
    const to = r.effectiveTo ? new Date(r.effectiveTo).getTime() : null;
    if (from !== null && now < from) return false;
    if (to !== null && now >= to) return false;
    return true;
  });
  const allowRules = inForce.filter((r) => String(r.type).toUpperCase() === "ALLOW");

  const hasLookup =
    s.lookupProvider !== "NONE" &&
    (s.lookupProvider !== "IPINFO" || Boolean(s.lookupApiKey));

  // Did anything at all resolve to a country in the last 24 hours? The log is
  // the only place that knows, and it settles the question that no amount of
  // reading settings can.
  let resolvedAny = null;
  let unknownBlockedHits = 0;
  if (blockStats) {
    resolvedAny = blockStats.some((r) => Number(r.withCountry) > 0);
    const row = blockStats.find((r) => r.reasonCode === "UNKNOWN_COUNTRY_BLOCKED");
    unknownBlockedHits = row ? Number(row.hits) : 0;
  }

  if (!s.enabled) {
    notes.push(
      inForce.length
        ? `Enforcement is OFF, but ${inForce.length} country rule(s) are saved and doing nothing.`
        : "Enforcement is OFF. Nothing is being blocked."
    );
    return { problems, notes, inForce, allowRules, resolvedAny, unknownBlockedHits };
  }

  // 1. The big one.
  if (s.blockUnknownCountry && !hasLookup && resolvedAny !== true) {
    problems.push({
      fatal: true,
      code: "NO_COUNTRY_SOURCE",
      title: "Every visitor on the platform is being refused",
      detail:
        '"Block when the country cannot be determined" is ON, but there is no IP lookup ' +
        "provider configured" +
        (s.trustCdnHeaders
          ? " and no CDN country header has produced a country"
          : ", and CDN header trust is switched off") +
        ". Nobody's country can be determined, so nobody is allowed in — your customers, " +
        "your staff and you. Your country rules are never reached." +
        (unknownBlockedHits
          ? ` The access log shows ${unknownBlockedHits.toLocaleString()} refusal(s) for this ` +
            `exact reason in the last 24 hours.`
          : ""),
      fix: `set ${K.blockUnknownCountry} = false`,
      apply: { [K.blockUnknownCountry]: "false" },
    });
  } else if (s.blockUnknownCountry && hasLookup && resolvedAny === false) {
    problems.push({
      fatal: true,
      code: "LOOKUP_NOT_WORKING",
      title: "The IP lookup provider is configured but is not resolving anything",
      detail:
        `${s.lookupProvider} is set, but not one request in the last 24 hours resolved to a ` +
        `country, and "block when the country cannot be determined" is ON — so every visitor ` +
        `is being refused. Common causes: no outbound internet from the server, a rejected or ` +
        `expired API key, an exhausted free-tier quota, or a reverse proxy hiding the real ` +
        `client address (see TRUST_PROXY below).`,
      fix: `set ${K.blockUnknownCountry} = false until the provider is verified`,
      apply: { [K.blockUnknownCountry]: "false" },
    });
  }

  // 2. Allowlist with nothing allowed.
  if (s.mode === "ALLOWLIST" && allowRules.length === 0) {
    problems.push({
      fatal: true,
      code: "ALLOWLIST_EMPTY",
      title: "Allowlist mode with no permitted countries blocks the entire world",
      detail:
        "In allowlist mode everyone is refused except explicitly allowed countries, and " +
        "there are no active ALLOW rules. Every visitor from every country is being turned away.",
      fix: `switch ${K.mode} back to BLOCKLIST (your BLOCK rules keep working), or add ALLOW rules`,
      apply: { [K.mode]: "BLOCKLIST" },
    });
  }

  /*
   * 3. Reverse proxy hiding everyone.
   *
   * NO LONGER GATED ON `TRUST_PROXY !== "true"`. Proxy trust is derived from the
   * connection's peer now — loopback is trusted with no configuration — so that
   * test flagged every correctly-working Apache and nginx install and told the
   * operator to set the one flag that would make them LESS safe (it trusts a
   * forwarding header from any peer, including a caller who reaches the API port
   * directly). The variable being unset is the recommended state.
   *
   * What is worth saying instead is what the operator has to get right on the
   * proxy, since the backend cannot do that part for them.
   */
  if (hasLookup && process.env.TRUST_PROXY !== "false") {
    problems.push({
      fatal: false,
      code: "PROXY_FORWARDING_UNVERIFIED",
      title: "Confirm your proxy forwards the visitor's address",
      detail:
        "A proxy on THIS machine needs nothing in .env — a forwarding header from a loopback " +
        "connection is honoured automatically. But the proxy has to send one, and neither " +
        "Apache nor nginx does by default in a way that is safe to read. Without it every " +
        "visitor appears to arrive from the proxy's own address and the lookup geolocates " +
        "your data centre instead of your customers.",
      fix:
        "Apache: 'a2enmod headers' + 'RequestHeader unset X-Forwarded-For' in the vhost. " +
        "nginx: 'proxy_set_header X-Forwarded-For $remote_addr;'. " +
        "Proxy on ANOTHER host: add its network to TRUST_PROXY_CIDRS.",
      apply: null,
    });
  }

  // 4. Both doors out, closed.
  if (!s.adminBypass && !s.allowAccountExit) {
    problems.push({
      fatal: false,
      code: "NO_RECOVERY_DOOR",
      title: "Both recovery routes are switched off",
      detail:
        "Administrators are not exempt and the account wind-down carve-out is off, so a bad " +
        "rule cannot be undone through the product. The geographic restriction admin pages " +
        "stay exempt no matter what, so the panel itself is still reachable — but nothing " +
        "else is, and customers cannot reach their balances.",
      fix: `set ${K.adminBypass} = true`,
      apply: { [K.adminBypass]: "true" },
    });
  } else if (!s.adminBypass) {
    notes.push(
      "Administrators are NOT exempt from the restrictions (geoRestrictionAdminBypass is off). " +
        "Only the geographic restriction pages themselves remain reachable."
    );
  } else if (!s.allowAccountExit) {
    notes.push(
      "The account wind-down carve-out is off: customers in restricted countries cannot sign " +
        "in, withdraw, or reach support. Their funds have no route out."
    );
  }

  // 5. No escape hatch.
  if (s.ipAllowlist.length === 0) {
    notes.push(
      "No always-allowed IP addresses are configured. Adding your office address is the " +
        "single most useful thing you can do to make a future mistake survivable — " +
        "re-run with --allow-ip <address> --fix."
    );
  }

  // 6. A control that is on and inert.
  if (s.blockAnonymizedIps && !["IP_API", "IPINFO"].includes(s.lookupProvider)) {
    notes.push(
      `VPN/proxy blocking is ON but ${s.lookupProvider === "NONE" ? "no provider is set" : s.lookupProvider + " does not report those flags"}, ` +
        "so no connection will ever be recognised as anonymised. The switch does nothing."
    );
  }

  if (s.failOpen === false && s.blockUnknownCountry) {
    notes.push(
      "Both fail-closed switches are on: an engine error and an unresolvable visitor both " +
        "produce a refusal, so a database blip can take the platform offline behind a " +
        "compliance notice rather than an error page."
    );
  }

  return { problems, notes, inForce, allowRules, resolvedAny, unknownBlockedHits };
}

/**
 * Writes settings and bumps the cache stamp. Returns the stamp.
 *
 * The stamp is the durable half of the invalidation: it is the only signal a
 * process can see when it cannot hear the broadcast, and the only one a process
 * that starts LATER can see at all. It is not sufficient on its own — see the
 * header, and propagate() below.
 */
async function applyUpdates(updates) {
  const entries = Object.entries(updates);
  if (!entries.length) return null;

  const stamp = `${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  await sequelize.transaction(async (transaction) => {
    for (const [key, value] of entries) {
      await sequelize.query(
        "INSERT INTO `settings` (`key`, `value`) VALUES (?, ?) " +
          "ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
        { replacements: [key, value], type: QueryTypes.INSERT, transaction }
      );
    }
    await sequelize.query(
      "INSERT INTO `settings` (`key`, `value`) VALUES (?, ?) " +
        "ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      { replacements: [CACHE_VERSION_KEY, stamp], type: QueryTypes.INSERT, transaction }
    );
  });

  return stamp;
}

/**
 * Make the repair visible to the processes that are actually serving traffic.
 *
 * Drop the shared hash FIRST, then announce. The order is the whole point: the
 * invalidation handler in cache.ts clears each process's in-memory Map but does
 * not reload from the database, so a process that is told to drop its copy while
 * the stale hash still exists simply refills from the stale hash. Delete first
 * and the same reload has nowhere to go but the rows this script just wrote.
 *
 * Only the `settings` hash is dropped. `extensions` is untouched by this script,
 * and every process re-reads it from an unchanged hash.
 *
 * Never throws. A platform that is refusing all traffic has already been
 * repaired in the database by the time this runs; failing to announce it is a
 * reason to tell the operator to restart, not a reason to abort the repair.
 */
async function propagate(version) {
  let Redis;
  try {
    ({ default: Redis } = await import("ioredis"));
  } catch (error) {
    return { ok: false, reason: `ioredis could not be loaded (${error?.message ?? error})` };
  }

  const client = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0"),
    // A one-shot CLI must fail fast and stay dead rather than sit in ioredis's
    // reconnect loop while an operator waits on a locked-out platform.
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    retryStrategy: () => null,
  });
  // ioredis emits "error" for every failed attempt; unhandled, the first one
  // would take this process down mid-repair.
  client.on("error", () => {});

  try {
    await client.connect();
    const removed = await client.del(SETTINGS_HASH_KEY);
    // __src identifies the publisher so a process can drop its OWN broadcasts.
    // Nothing live shares this value, so every listener acts on the message.
    await client.publish(
      CACHE_INVALIDATE_CHANNEL,
      JSON.stringify({
        version,
        __src: `geo-doctor.${process.pid}`,
        __at: Date.now(),
      })
    );
    return { ok: true, hashDropped: removed > 0 };
  } catch (error) {
    return { ok: false, reason: error?.message ?? String(error) };
  } finally {
    try {
      client.disconnect();
    } catch {}
  }
}

async function main() {
  say(bar());
  say(`Geo Restriction Doctor  (${WRITING ? "REPAIR" : "DIAGNOSE — read only"})`);
  say(bar() + "\n");

  await sequelize.authenticate();

  const [settingsTable] = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'settings'`,
    { replacements: [sequelize.config.database], type: QueryTypes.SELECT }
  );
  if (!settingsTable) {
    console.error(
      `ERROR: no \`settings\` table in schema \`${sequelize.config.database}\`. ` +
        `Check backend/.env points at the right database.`
    );
    process.exitCode = 1;
    return;
  }

  const s = await readSettings();
  const rules = await readRules();
  const blockStats = await readRecentBlocks();
  const { problems, notes, inForce, allowRules, resolvedAny, unknownBlockedHits } =
    diagnose(s, rules, blockStats);

  // ---- Current state -----------------------------------------------------
  say("CURRENT POLICY");
  say(`  Enforcement ............... ${s.enabled ? "ON" : "off"}`);
  say(`  Mode ...................... ${s.mode}`);
  say(`  Block unknown country ..... ${s.blockUnknownCountry ? "ON  <-- fail closed" : "off"}`);
  say(`  IP lookup provider ........ ${s.lookupProvider}${s.lookupApiKey ? " (key set)" : ""}`);
  say(`  Trust CDN headers ......... ${s.trustCdnHeaders ? "on" : "OFF"}`);
  say(`  Admin bypass .............. ${s.adminBypass ? "on" : "OFF"}`);
  say(`  Account wind-down ......... ${s.allowAccountExit ? "on" : "OFF"}`);
  say(`  Fail open on engine error . ${s.failOpen ? "on" : "OFF"}`);
  say(`  Always-allowed IPs ........ ${s.ipAllowlist.length ? s.ipAllowlist.join(", ") : "(none)"}`);
  // The EFFECTIVE policy. "not set" is correct and expected for a same-host
  // proxy — it does not mean forwarding headers are being ignored.
  const trustMode =
    process.env.TRUST_PROXY === "true"
      ? "true (any peer — only correct for an off-host load balancer)"
      : process.env.TRUST_PROXY === "false"
        ? "false (forwarding headers disabled entirely)"
        : "unset (loopback trusted — correct for a same-host proxy)";
  say(`  TRUST_PROXY (env) ......... ${trustMode}`);
  say(`  TRUST_PROXY_CIDRS ......... ${process.env.TRUST_PROXY_CIDRS || "(none)"}`);
  say(
    `  Active country rules ...... ${rules === null ? "(table missing)" : `${inForce.length} in force, ${allowRules.length} ALLOW`}`
  );
  say("");

  // ---- Evidence ----------------------------------------------------------
  if (blockStats && blockStats.length) {
    say("DECISIONS IN THE LAST 24 HOURS");
    for (const row of blockStats) {
      say(
        `  ${String(row.reasonCode).padEnd(24)} ${String(Number(row.hits).toLocaleString()).padStart(10)} hits` +
          `   ${Number(row.withCountry) > 0 ? "country resolved" : "no country"}`
      );
    }
    if (resolvedAny === false) {
      say("\n  Not one decision resolved to a country. Detection is not working at all.");
    }
    say("");
  } else if (blockStats) {
    say("DECISIONS IN THE LAST 24 HOURS\n  (none logged)\n");
  }

  // ---- Findings ----------------------------------------------------------
  const fatal = problems.filter((p) => p.fatal);

  if (!problems.length) {
    say("DIAGNOSIS\n  No lockout conditions found.");
  } else {
    say("DIAGNOSIS");
    problems.forEach((p, i) => {
      say(`\n  ${i + 1}. [${p.fatal ? "TOTAL OUTAGE" : "RISK"}] ${p.title}`);
      say(`     ${p.detail.replace(/\s+/g, " ")}`);
      say(`     Fix: ${p.fix}`);
    });
  }
  if (notes.length) {
    say("\nALSO WORTH KNOWING");
    for (const n of notes) say(`  - ${n.replace(/\s+/g, " ")}`);
  }
  say("");

  // ---- Repair ------------------------------------------------------------
  const updates = {};

  if (DISABLE) {
    updates[K.enabled] = "false";
  } else if (FIX) {
    for (const p of problems) {
      if (p.fatal && p.apply) Object.assign(updates, p.apply);
    }
    // Restore the recovery doors alongside any fatal repair: fixing the outage
    // while leaving the operator with no way to survive the next one is half
    // a job.
    if (Object.keys(updates).length) {
      if (!s.adminBypass) updates[K.adminBypass] = "true";
      if (!s.allowAccountExit) updates[K.allowAccountExit] = "true";
    }
  }

  if (ALLOW_IP) {
    if (!/^[0-9a-fA-F:.]+(\/\d{1,3})?$/.test(ALLOW_IP)) {
      console.error(`ERROR: "${ALLOW_IP}" does not look like an IP address or CIDR range.`);
      process.exitCode = 1;
      return;
    }
    if (s.ipAllowlist.includes(ALLOW_IP)) {
      say(`Always-allowed list already contains ${ALLOW_IP}.`);
    } else {
      updates[K.ipAllowlist] = [...s.ipAllowlist, ALLOW_IP].join(",");
    }
  }

  if (!WRITING) {
    if (fatal.length) {
      say(bar("-"));
      say("This platform is currently refusing ALL traffic.");
      say("Re-run with --fix to apply the repairs listed above:");
      say("\n    node scripts/geo-doctor.mjs --fix\n");
      say("Or switch the whole feature off:");
      say("\n    node scripts/geo-doctor.mjs --disable\n");
      say(bar("-"));
      process.exitCode = 2;
    } else {
      say("Read-only run. Nothing was changed.");
    }
    return;
  }

  if (!Object.keys(updates).length) {
    say("Nothing to repair — no fatal condition had an automatic fix to apply.");
    return;
  }

  say("APPLYING");
  for (const [key, value] of Object.entries(updates)) say(`  ${key} = ${value}`);

  const stamp = await applyUpdates(updates);
  const propagation = await propagate(stamp);

  const after = await readSettings();
  say("\nVERIFIED");
  say(`  Enforcement ............... ${after.enabled ? "ON" : "off"}`);
  say(`  Block unknown country ..... ${after.blockUnknownCountry ? "ON" : "off"}`);
  say(`  Admin bypass .............. ${after.adminBypass ? "on" : "OFF"}`);
  say(`  Account wind-down ......... ${after.allowAccountExit ? "on" : "OFF"}`);
  say(`  Always-allowed IPs ........ ${after.ipAllowlist.length ? after.ipAllowlist.join(", ") : "(none)"}`);

  if (propagation.ok) {
    say(
      "\nThe shared settings cache was dropped and every running process was told to\n" +
        "reload, so this is already live. No restart needed."
    );
  } else {
    say("\n" + bar("-"));
    say("THE DATABASE IS REPAIRED, BUT THE RUNNING PLATFORM HAS NOT PICKED IT UP.");
    say(bar("-"));
    say(`Redis could not be reached: ${propagation.reason}`);
    say(
      "\nThe backend keeps settings in memory AND in a shared Redis hash that never\n" +
        "expires, so it will go on serving the old policy — and a restart alone will\n" +
        "reload the same stale hash. Finish the repair by hand:\n"
    );
    say("    redis-cli DEL settings");
    say("    pm2 restart all\n");
    say(
      "If this install has no Redis server of its own, the DEL is a harmless no-op and\n" +
        "the restart is enough."
    );
    say(bar("-"));
  }
  say(
    "\nNEXT: the platform is reachable, but country detection is still not configured.\n" +
      "Set an IP lookup provider (ip-api.com needs no key) or put the site behind a CDN\n" +
      "that sends a country header, verify with the rule tester on the geographic\n" +
      "restrictions page, and only then turn the strict switch back on."
  );
  say(bar());
}

main()
  .catch((e) => {
    console.error("geo-doctor failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
