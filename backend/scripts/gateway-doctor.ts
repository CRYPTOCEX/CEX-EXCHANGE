/**
 * Diagnose (and optionally repair) payment-gateway currency configuration.
 *
 *   cd backend
 *   npm run gateway:doctor                          # report only
 *   npm run gateway:doctor:fix                      # repair merchant rows
 *   npm run gateway:doctor:fix -- --enable-base-currency
 *
 * WHY THIS EXISTS
 * ---------------
 * A payment has to clear THREE independent currency gates, and they were seeded
 * from lists ordered `id ASC`:
 *
 *   1. `payment/create` -> validateCurrency(currency, merchant.allowedCurrencies)
 *   2. `payment/create` -> validatePaymentAgainstSettings(): the currency must
 *      also be enabled for its wallet type in `gatewayAllowedWalletTypes`
 *   3. `checkout/[id]/wallets` + `confirm`: the wallet the CUSTOMER pays from
 *      must be an enabled walletType/currency pair in that same setting
 *
 * Merchant creation used to seed gate 1 with `currencies.slice(0, 3)` and the
 * admin panel seeded gate 2 the same way. Alphabetically the first three fiat
 * currencies are AED, AFN, ARS — so installs ended up with merchants who could
 * not price anything in USD, failing with "Currency USD is not supported by
 * this merchant" while the platform's fees and limits were all quoted in USD.
 * Both seeds are fixed, but rows written before that stay broken, and neither
 * the merchant settings page nor the merchant API surface a currency editor —
 * so without this script the only route out is hand-written SQL.
 *
 * Gate 3 is the one worth reading the report for: pricing in USD and PAYING in
 * crypto is fully supported (the checkout prices each wallet through
 * `getPriceInUSD` and verifies the rate within 2%), but only for wallet
 * type/currency pairs enabled in the setting. A platform with just
 * `FIAT: [USD]` produces valid USD invoices that no crypto wallet can settle,
 * and the customer sees an empty wallet list rather than an error.
 *
 * WHAT --apply CHANGES
 * --------------------
 * Merchant rows only, and only to make them consistent with the platform
 * allowlist the admin already chose: it never widens `gatewayAllowedWalletTypes`
 * itself, because which currencies a platform accepts is the operator's
 * decision and not something a repair should invent. `--enable-base-currency`
 * is the one exception and has to be asked for by name.
 */

import { models } from "@b/db";
import { CacheManager } from "@b/utils/cache";

const APPLY = process.argv.includes("--apply") || process.argv.includes("--fix");
const ENABLE_BASE = process.argv.includes("--enable-base-currency");
const BASE_CURRENCY = "USD";

type WalletTypeConfig = { enabled?: boolean; currencies?: string[] };
type AllowedWalletTypes = Record<string, WalletTypeConfig>;

const CRYPTO_TYPES = ["SPOT", "ECO"];

function parseSetting(raw: unknown): AllowedWalletTypes {
  if (raw == null) return {};
  if (typeof raw === "object") return raw as AllowedWalletTypes;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Every walletType/currency pair the platform will actually settle. */
function enabledPairs(allowed: AllowedWalletTypes) {
  const pairs: Array<{ type: string; currency: string }> = [];
  for (const [type, config] of Object.entries(allowed)) {
    if (!config?.enabled || !Array.isArray(config.currencies)) continue;
    for (const currency of config.currencies) pairs.push({ type, currency });
  }
  return pairs;
}

async function main() {
  const problems: string[] = [];

  // ---------------------------------------------------------------- gate 2/3
  const settingRow: any = await models.settings.findOne({
    where: { key: "gatewayAllowedWalletTypes" },
  });
  const allowed = parseSetting(settingRow?.value);
  const pairs = enabledPairs(allowed);
  const platformCurrencies = [...new Set(pairs.map((p) => p.currency))];

  console.log("\n  PLATFORM  (gatewayAllowedWalletTypes)");
  if (!settingRow) {
    console.log("    setting absent — the gateway rejects every payment");
    problems.push("gatewayAllowedWalletTypes is not set");
  } else if (Object.keys(allowed).length === 0) {
    console.log("    setting empty — the gateway rejects every payment");
    problems.push("gatewayAllowedWalletTypes is empty");
  } else {
    for (const [type, config] of Object.entries(allowed)) {
      const list = Array.isArray(config?.currencies) ? config.currencies : [];
      const state = config?.enabled ? "enabled " : "disabled";
      console.log(
        `    ${type.padEnd(5)} ${state}  ${list.length ? list.join(", ") : "(no currencies)"}`
      );
      // An enabled type with no currencies reads as "on" in the admin panel and
      // in the merchant's API-key badge, but rejects everything at gate 2.
      if (config?.enabled && list.length === 0) {
        problems.push(`${type} is enabled with zero currencies — it settles nothing`);
      }
    }
  }

  if (pairs.length && !platformCurrencies.includes(BASE_CURRENCY)) {
    problems.push(
      `${BASE_CURRENCY} is not enabled for any wallet type, but gateway fees and ` +
        `limits are quoted in ${BASE_CURRENCY}`
    );
  }

  const cryptoPairs = pairs.filter((p) => CRYPTO_TYPES.includes(p.type));
  if (pairs.length && cryptoPairs.length === 0) {
    problems.push(
      "no SPOT or ECO currency is enabled — customers cannot settle any invoice " +
        "in crypto, and the checkout shows them an empty wallet list"
    );
  }

  // ------------------------------------------------------------------ gate 1
  const merchants: any[] = await models.gatewayMerchant.findAll({
    attributes: [
      "id",
      "slug",
      "allowedCurrencies",
      "allowedWalletTypes",
      "defaultCurrency",
      "status",
    ],
  });

  console.log(`\n  MERCHANTS  (${merchants.length})`);

  const repairs: Array<{ merchant: any; currencies: string[]; defaultCurrency: string }> = [];

  for (const m of merchants) {
    const currencies: string[] = Array.isArray(m.allowedCurrencies)
      ? m.allowedCurrencies
      : [];
    // Gate 1 and gate 2 are ANDed, so only the intersection is chargeable.
    const usable = platformCurrencies.length
      ? currencies.filter((c) => platformCurrencies.includes(c))
      : currencies;
    const notes: string[] = [];

    if (currencies.length === 0) notes.push("no allowed currencies");
    if (platformCurrencies.length && usable.length === 0) {
      notes.push(
        `none of [${currencies.join(", ") || "-"}] is enabled platform-wide`
      );
    }
    if (!currencies.includes(m.defaultCurrency)) {
      notes.push(`defaultCurrency ${m.defaultCurrency} is not in its own list`);
    } else if (platformCurrencies.length && !usable.includes(m.defaultCurrency)) {
      notes.push(`defaultCurrency ${m.defaultCurrency} is not enabled platform-wide`);
    }

    console.log(
      `    ${String(m.slug).padEnd(24)} ${m.status.padEnd(8)} ` +
        `[${currencies.join(", ") || "-"}] default=${m.defaultCurrency}`
    );
    for (const note of notes) console.log(`      ! ${note}`);

    if (!notes.length) continue;
    problems.push(`merchant ${m.slug}: ${notes.join("; ")}`);

    /*
      A merchant that still has ONE chargeable currency is not broken, so its
      list is left exactly as it is and only `defaultCurrency` is re-pointed.

      Narrowing it to `usable` would be destructive for no gain: a currency
      that is disabled platform-wide today is already refused at gate 2, and
      dropping it from the merchant means re-enabling it in settings silently
      fails to bring the merchant back. It also throws away entries for wallet
      types the operator has not configured YET — running this before enabling
      SPOT/ECO would strip every crypto currency off every merchant.

      Only a merchant with nothing chargeable gets its list rewritten, because
      there is nothing there worth keeping.
    */
    const currenciesTarget = usable.length
      ? currencies
      : platformCurrencies.length
        ? platformCurrencies
        : [BASE_CURRENCY];
    const defaultPool = usable.length ? usable : currenciesTarget;
    repairs.push({
      merchant: m,
      currencies: currenciesTarget,
      defaultCurrency:
        defaultPool.find((c) => c === BASE_CURRENCY) || defaultPool[0],
    });
  }

  // ------------------------------------------------------- api-key snapshots
  /*
    Reported, never rewritten. `ApiKeyForm.toggleWalletType` used to copy the
    platform's whole currency list into the key, so a stored list that still
    matches it is almost certainly a snapshot rather than a choice — which is
    why `validateApiKeyWalletScope` enforces the wallet TYPE only and leaves
    the currency list alone. Rewriting a merchant's key scope on their behalf
    would be a security-relevant edit made on a guess, so this lane exists to
    let the operator look, not to act.
  */
  const keys: any[] = await models.gatewayApiKey.findAll({
    attributes: ["id", "name", "merchantId", "allowedWalletTypes"],
  });

  const scoped = keys.filter((k) => {
    const scope = k.allowedWalletTypes;
    return scope && typeof scope === "object" && !Array.isArray(scope);
  });

  if (scoped.length) {
    console.log(`\n  API KEYS  (${scoped.length} of ${keys.length} carry a wallet scope)`);
    for (const k of scoped) {
      const scope = k.allowedWalletTypes as AllowedWalletTypes;
      const types = Object.entries(scope).filter(([, c]) => c?.enabled);
      const parts = types.map(([type, config]) => {
        const list = Array.isArray(config?.currencies) ? config.currencies : [];
        if (list.length === 0) return `${type}=all`;
        const platform = Array.isArray(allowed[type]?.currencies)
          ? allowed[type]!.currencies!
          : [];
        const isSnapshot =
          platform.length > 0 &&
          list.length === platform.length &&
          list.every((c) => platform.includes(c));
        return `${type}=[${list.join(",")}]${isSnapshot ? " (snapshot)" : ""}`;
      });
      console.log(`    ${String(k.name).padEnd(24)} ${parts.join("  ") || "(nothing enabled)"}`);

      /*
        The one genuinely NEW refusal `validateApiKeyWalletScope` introduces,
        so it must be visible before a deploy rather than discovered by a live
        integration. Switching a type off on a key deletes its entry, which is
        a deliberate act — but a merchant who did that months ago while the
        gate was dead has never seen it take effect.
      */
      const owner = merchants.find((m) => m.id === k.merchantId);
      const merchantTypes: string[] = Array.isArray(owner?.allowedWalletTypes)
        ? owner!.allowedWalletTypes
        : [];
      const nowRefused = merchantTypes.filter(
        (t) => !types.some(([type]) => type === t)
      );
      if (types.length && nowRefused.length) {
        console.log(
          `      ! ${nowRefused.join(", ")} payments through this key are now ` +
            `REFUSED (its owner allows them, this key is not scoped for them)`
        );
        problems.push(
          `api key "${k.name}": ${nowRefused.join(", ")} payments now refused by key scope`
        );
      }
      const blocked = types.length
        ? platformCurrencies.filter((c) =>
            types.every(([, config]) => {
              const list = Array.isArray(config?.currencies) ? config.currencies : [];
              return list.length > 0 && !list.includes(c);
            })
          )
        : [];
      if (blocked.length) {
        console.log(
          `      i currency list omits ${blocked.join(", ")} — not enforced, ` +
            `re-pick currencies on this key to make the scope meaningful`
        );
      }
    }
  }

  // ------------------------------------------------------------------ report
  console.log(`\n  ${problems.length} problem(s)`);
  for (const p of problems) console.log(`    - ${p}`);

  if (!problems.length) {
    console.log("  gateway currency configuration is consistent\n");
    return;
  }

  if (!APPLY) {
    console.log(
      `\n  dry run. Re-run with --fix to rewrite ${repairs.length} merchant row(s).\n` +
        `  Platform wallet types are left alone — enable currencies in\n` +
        `  Admin > Gateway > Settings, or pass --enable-base-currency to add\n` +
        `  ${BASE_CURRENCY} to the FIAT list here.\n`
    );
    return;
  }

  let changed = 0;

  if (ENABLE_BASE) {
    const fiatActive = await models.currency.findOne({
      where: { id: BASE_CURRENCY, status: true },
    });
    if (!fiatActive) {
      console.log(
        `\n  cannot enable ${BASE_CURRENCY}: it is not an active row in \`currency\`.\n` +
          `  Enable it first in Admin > Finance > Currencies.`
      );
    } else {
      const fiat = allowed.FIAT || {};
      const list = Array.isArray(fiat.currencies) ? fiat.currencies : [];
      if (!fiat.enabled || !list.includes(BASE_CURRENCY)) {
        allowed.FIAT = {
          enabled: true,
          currencies: [...new Set([...list, BASE_CURRENCY])],
        };
        const value = JSON.stringify(allowed);
        if (settingRow) {
          await settingRow.update({ value });
        } else {
          await models.settings.create({ key: "gatewayAllowedWalletTypes", value });
        }
        // Gateway settings are read through the cache, so the flip is not live
        // until this clears — same step the admin settings route takes.
        await CacheManager.getInstance().clearCache();
        console.log(`\n  enabled ${BASE_CURRENCY} for FIAT payments`);
        changed++;

        // Recompute so merchant repairs below see the widened allowlist — a
        // merchant that was dead a moment ago may now have a usable currency,
        // in which case its own list is preserved (see the repair rule above).
        const widened = [...new Set(enabledPairs(allowed).map((p) => p.currency))];
        for (const r of repairs) {
          const own: string[] = Array.isArray(r.merchant.allowedCurrencies)
            ? r.merchant.allowedCurrencies
            : [];
          const usable = own.filter((c) => widened.includes(c));
          r.currencies = usable.length ? own : widened;
          const pool = usable.length ? usable : widened;
          r.defaultCurrency = pool.find((c) => c === BASE_CURRENCY) || pool[0];
        }
      }
    }
  }

  for (const r of repairs) {
    await models.gatewayMerchant.update(
      {
        allowedCurrencies: r.currencies,
        defaultCurrency: r.defaultCurrency,
      },
      { where: { id: r.merchant.id } }
    );
    console.log(
      `  ${r.merchant.slug}: [${r.currencies.join(", ")}] default=${r.defaultCurrency}`
    );
    changed++;
  }

  console.log(`\n  applied ${changed} change(s)\n`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("gateway doctor failed:", e);
    process.exit(1);
  });
