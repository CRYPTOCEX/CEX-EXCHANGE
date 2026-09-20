/**
 * Move native push tokens out of `user.settings.pushTokens` and into
 * `mobile_device`.
 *
 *   pnpm --filter backend push-tokens:migrate            # dry run, writes nothing
 *   pnpm --filter backend push-tokens:migrate --apply    # perform it
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A SCRIPT AND NOT A SEEDER OR A BOOT STEP
 * ---------------------------------------------------------------------------
 * It is not required for correctness. `PushChannel` still reads the settings
 * blob, and a native client repopulates the registry the first time it
 * registers, so an install that never runs this keeps working. Making it a boot
 * step would put a full `user` table scan in the startup path of every install
 * for a one-time tidy-up.
 *
 * ---------------------------------------------------------------------------
 * FIVE SHAPES, ALL OF WHICH EXIST
 * ---------------------------------------------------------------------------
 * `PushChannel.categorizeTokens` accepts all of these, so real rows use them:
 *
 *   1. pushTokens: ["<token>", …]                       bare strings
 *   2. pushTokens: [{ type, token, deviceId, platform }] typed array entries
 *   3. pushTokens: { "<deviceId>": "<token>" }           keyed, string value
 *   4. pushTokens: { "<deviceId>": { type, token, … } }  keyed, object value
 *   5. webPushSubscriptions: [ … ]                       a separate array
 *
 * Only NATIVE entries move. Shape 5 and anything whose token parses as a Web
 * Push subscription is a BROWSER and stays where it is — `mobile_device` has no
 * `web` platform by design, and moving a browser subscription there would be a
 * category error that also breaks web delivery.
 *
 * An entry with no usable `deviceId` is SKIPPED, not invented: the unique key
 * is (userId, deviceId), and a synthetic id would create a row the client can
 * never match, so it could be revoked by nobody and would outlive the install.
 * Those are reported rather than silently dropped.
 */

import { models } from "@b/db";
import { Op } from "sequelize";

const APPLY = process.argv.includes("--apply");

interface Candidate {
  userId: string;
  deviceId: string;
  platform: "ios" | "android";
  pushToken: string;
}

interface Skipped {
  userId: string;
  reason: string;
  detail: string;
}

/** A Web Push subscription is a JSON blob with an endpoint and keys. */
function looksLikeWebPush(token: string): boolean {
  try {
    const parsed = JSON.parse(token);
    return Boolean(parsed?.endpoint && parsed?.keys?.p256dh && parsed?.keys?.auth);
  } catch {
    return false;
  }
}

function nativePlatform(value: unknown): "ios" | "android" | null {
  return value === "ios" || value === "android" ? value : null;
}

/** Every native candidate in one user's settings blob. */
function extract(userId: string, settings: any, skipped: Skipped[]): Candidate[] {
  const out: Candidate[] = [];
  const tokens = settings?.pushTokens;
  if (!tokens) return out;

  const consider = (
    entry: any,
    keyedDeviceId: string | null
  ): void => {
    // Shapes 1 and 3: the value is the token itself.
    if (typeof entry === "string") {
      if (looksLikeWebPush(entry)) return; // browser — leave it alone
      // A bare string carries no platform, so it cannot be classified. Web FCM
      // and native FCM tokens are indistinguishable by inspection.
      skipped.push({
        userId,
        reason: "no platform",
        detail: `deviceId=${keyedDeviceId ?? "(none)"} — bare token, cannot tell native from web`,
      });
      return;
    }
    if (!entry || typeof entry !== "object") return;

    const token = entry.token;
    if (typeof token !== "string" || !token) return;
    if (entry.type === "webpush" || looksLikeWebPush(token)) return;

    const platform = nativePlatform(entry.platform);
    if (!platform) {
      skipped.push({
        userId,
        reason: "not native",
        detail: `platform=${String(entry.platform ?? "(unset)")}`,
      });
      return;
    }

    const deviceId = entry.deviceId || keyedDeviceId;
    if (!deviceId) {
      skipped.push({
        userId,
        reason: "no deviceId",
        detail: `platform=${platform} — a synthetic id could never be matched by the client`,
      });
      return;
    }

    out.push({ userId, deviceId: String(deviceId), platform, pushToken: token });
  };

  if (Array.isArray(tokens)) {
    for (const entry of tokens) consider(entry, null);
  } else if (typeof tokens === "object") {
    for (const [deviceId, value] of Object.entries(tokens)) consider(value, deviceId);
  }

  return out;
}

async function main() {
  console.log("\n" + "=".repeat(74));
  console.log(`  PUSH TOKEN MIGRATION -> mobile_device   ${APPLY ? "(APPLY)" : "(dry run)"}`);
  console.log("=".repeat(74));

  const users = await models.user.findAll({
    where: { settings: { [Op.ne]: null } as any },
    attributes: ["id", "settings"],
  });

  const candidates: Candidate[] = [];
  const skipped: Skipped[] = [];

  for (const user of users as any[]) {
    let settings = user.settings;
    // MySQL JSON columns arrive as a string on some driver/version pairs.
    if (typeof settings === "string") {
      try {
        settings = JSON.parse(settings);
      } catch {
        skipped.push({ userId: user.id, reason: "unparseable settings", detail: "" });
        continue;
      }
    }
    candidates.push(...extract(user.id, settings, skipped));
  }

  console.log(`\n  scanned ${users.length} user(s) with settings`);
  console.log(`  ${candidates.length} native token(s) eligible`);
  console.log(`  ${skipped.length} entr(ies) skipped\n`);

  const byReason = skipped.reduce<Record<string, number>>((acc, s) => {
    acc[s.reason] = (acc[s.reason] || 0) + 1;
    return acc;
  }, {});
  for (const [reason, n] of Object.entries(byReason)) {
    console.log(`    skipped: ${reason.padEnd(22)} ${n}`);
  }

  if (!candidates.length) {
    console.log("\n  Nothing to migrate.\n");
    process.exit(0);
  }

  if (!APPLY) {
    console.log("\n  Sample of what would be written:");
    for (const c of candidates.slice(0, 5)) {
      console.log(
        `    user=${c.userId} device=${c.deviceId} platform=${c.platform} ` +
          `token=${c.pushToken.slice(0, 12)}…`
      );
    }
    console.log(`\n  Dry run — nothing written. Re-run with --apply.\n`);
    process.exit(0);
  }

  let created = 0;
  let updated = 0;
  for (const c of candidates) {
    // Never clobber a live registration: a client that has already registered
    // holds the newer token, and the blob copy is by definition the older one.
    const existing = await models.mobileDevice.findOne({
      where: { userId: c.userId, deviceId: c.deviceId },
    });
    if (existing) {
      updated += 1;
      continue;
    }
    await models.mobileDevice.create({
      userId: c.userId,
      deviceId: c.deviceId,
      platform: c.platform,
      pushToken: c.pushToken,
      appVersion: null,
      locale: null,
      lastSeenAt: new Date(),
      revokedAt: null,
    } as any);
    created += 1;
  }

  console.log(`\n  created ${created} row(s); ${updated} already registered and left alone.`);
  console.log(
    `\n  The settings blob is NOT cleared: PushChannel still reads it, and a\n` +
      `  cleared blob would silently stop delivery to any client that has not\n` +
      `  yet re-registered. Clearing is a separate decision for Phase 11.\n`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("\n  migration failed:", error?.message);
  console.error(error?.stack);
  process.exit(1);
});
