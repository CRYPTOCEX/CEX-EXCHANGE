"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preflightPolicy = preflightPolicy;
exports.preflightBlocksSave = preflightBlocksSave;
exports.formatPreflightRefusal = formatPreflightRefusal;
const lookup_1 = require("./lookup");
const policy_1 = require("./policy");
const ip_1 = require("./ip");
const settings_1 = require("./settings");
const K = settings_1.GEO_SETTING_KEYS;
const PROVIDERS_WITH_ANONYMITY_FLAGS = new Set(["IP_API", "IPINFO"]);
function describeCountrySources(policy, evidence) {
    const cdnPossible = policy.trustCdnHeaders;
    const lookupConfigured = policy.lookupProvider !== "NONE" &&
        (policy.lookupProvider !== "IPINFO" || Boolean(policy.lookupApiKey));
    const proven = evidence.cdnHeaderObserved || evidence.lookupObserved;
    if (proven) {
        const which = [
            evidence.cdnHeaderObserved ? "CDN country headers" : null,
            evidence.lookupObserved ? "the IP lookup provider" : null,
        ]
            .filter(Boolean)
            .join(" and ");
        return { configured: true, proven: true, summary: `working, via ${which}` };
    }
    if (lookupConfigured) {
        return {
            configured: true,
            proven: false,
            summary: `${policy.lookupProvider} is configured but has not yet successfully resolved a country`,
        };
    }
    if (cdnPossible) {
        return {
            configured: false,
            proven: false,
            summary: "no IP lookup provider is set, and no CDN country header has ever been seen on a request",
        };
    }
    return {
        configured: false,
        proven: false,
        summary: "CDN headers are switched off and no IP lookup provider is set",
    };
}
function inForceRules(rules, now) {
    return rules.filter((rule) => (0, policy_1.isRuleInForce)(rule, now));
}
function wouldBlock(policy, rules, ctx, location, now) {
    const byCountry = new Map();
    for (const rule of inForceRules(rules, now)) {
        const bucket = byCountry.get(rule.countryCode);
        if (bucket)
            bucket.push(rule);
        else
            byCountry.set(rule.countryCode, [rule]);
    }
    return (0, policy_1.evaluate)(ctx, location, policy, {
        now,
        rulesFor: (code) => { var _a; return ((_a = byCountry.get(code)) !== null && _a !== void 0 ? _a : [])
            .slice()
            .sort((a, b) => (a.type === b.type ? 0 : a.type === "ALLOW" ? -1 : 1)); },
    });
}
function visitorContext(ip) {
    return {
        path: "/",
        method: "GET",
        ip,
        headers: {},
        userId: null,
        roleName: null,
    };
}
function preflightPolicy(before, after, ctx) {
    var _a, _b;
    var _c, _d;
    const now = (_c = ctx.now) !== null && _c !== void 0 ? _c : Date.now();
    const findings = [];
    const add = (f) => findings.push(f);
    const sources = describeCountrySources(after, ctx.evidence);
    const rules = inForceRules(ctx.rules, now);
    const allowRules = rules.filter((r) => r.type === "ALLOW");
    const turningOn = after.enabled && !before.enabled;
    if (after.enabled && after.blockUnknownCountry && !sources.proven) {
        if (!sources.configured) {
            add({
                code: "NO_COUNTRY_SOURCE",
                severity: "LOCKOUT",
                forceable: false,
                settingKey: K.blockUnknownCountry,
                title: "This would refuse every visitor on the platform, not just restricted countries",
                detail: `"Block when the country cannot be determined" is on, but this install has no way ` +
                    `to determine anyone's country — ${sources.summary}. Every request would be ` +
                    `unplaceable, so every request would be refused: your customers, your ` +
                    `administrators, and you. The country rules you have configured would never ` +
                    `be reached at all.`,
                remedy: "Set an IP geolocation provider under Detection (ip-api.com works without a key), " +
                    "or put the site behind a CDN that sends a country header such as Cloudflare. " +
                    "Once a country has actually been resolved on a live request, this switch becomes " +
                    "available.",
            });
        }
        else {
            add({
                code: "COUNTRY_SOURCE_UNVERIFIED",
                severity: "LOCKOUT",
                forceable: true,
                settingKey: K.blockUnknownCountry,
                title: "Country detection has not proven itself yet",
                detail: `"Block when the country cannot be determined" is on, and ${sources.summary}. ` +
                    `If it does not work — a rejected API key, an exhausted quota, a blocked outbound ` +
                    `connection — every visitor becomes unplaceable and every visitor is refused.`,
                remedy: "Save with this switch off, use the rule tester on the geographic restrictions page " +
                    "to confirm a real IP resolves to the right country, then turn it on.",
            });
        }
    }
    if (after.enabled && after.mode === "ALLOWLIST" && allowRules.length === 0) {
        add({
            code: "ALLOWLIST_EMPTY",
            severity: "LOCKOUT",
            forceable: false,
            settingKey: K.mode,
            title: "Allowlist mode with no permitted countries blocks the entire world",
            detail: "In allowlist mode everyone is refused except the countries you have explicitly " +
                "allowed, and there are currently no active ALLOW rules. Saving this refuses every " +
                "visitor from every country.",
            remedy: "Add the countries you serve as ALLOW rules on the geographic restrictions page " +
                "first, then switch the mode over.",
        });
    }
    if (after.enabled && ((_a = ctx.actor) === null || _a === void 0 ? void 0 : _a.ip)) {
        const decision = wouldBlock(after, ctx.rules, visitorContext(ctx.actor.ip), (_d = ctx.actor.location) !== null && _d !== void 0 ? _d : (0, lookup_1.emptyLocation)(), now);
        if (!decision.allowed) {
            const allowlisted = (0, ip_1.matchesIpList)(ctx.actor.ip, after.ipAllowlist);
            const where = ((_b = ctx.actor.location) === null || _b === void 0 ? void 0 : _b.countryName)
                ? ` in ${ctx.actor.location.countryName}`
                : "";
            const stillHasAdminDoor = after.adminBypass && !allowlisted;
            add({
                code: stillHasAdminDoor ? "ACTOR_BLOCKED" : "ACTOR_LOCKED_OUT",
                severity: "LOCKOUT",
                forceable: true,
                settingKey: K.enabled,
                title: stillHasAdminDoor
                    ? `Your own connection${where} would be blocked from the public site`
                    : `Your own connection${where} would be blocked, with no way back in`,
                detail: stillHasAdminDoor
                    ? `Evaluating your address (${ctx.actor.ip}) against this policy as an ordinary ` +
                        `visitor gives: ${decision.reasonCode}. You would keep admin access because ` +
                        `administrators are exempt, but you would not be able to use the platform itself, ` +
                        `and neither would anyone else connecting the way you do.`
                    : `Evaluating your address (${ctx.actor.ip}) against this policy gives: ` +
                        `${decision.reasonCode}, and the administrator exemption is off in this same ` +
                        `change. Recovery would mean editing the database by hand or running ` +
                        `scripts/geo-doctor.mjs on the server.`,
                remedy: `Add ${ctx.actor.ip} to the always-allowed IP list under Exceptions before saving. ` +
                    `It is checked ahead of every country rule and is the intended escape hatch.`,
            });
        }
    }
    if (after.enabled && ctx.evidence.untrustedProxyObserved) {
        add({
            code: "UNTRUSTED_PROXY",
            severity: turningOn ? "LOCKOUT" : "WARNING",
            forceable: true,
            title: "Visitor addresses are being hidden by a reverse proxy",
            detail: "Requests are arriving with forwarding headers, but the address the engine ends up " +
                "with is still a private one — so it is geolocating your proxy rather than your " +
                "visitors. Every country decision on this install is currently being made about the " +
                "wrong address.",
            remedy: "Forwarding headers are honoured from a proxy on this machine with no configuration. " +
                "If yours is on another host, add its address to TRUST_PROXY_CIDRS and restart. " +
                "Check the proxy sends the header at all — Apache needs 'a2enmod headers' plus " +
                "'RequestHeader unset X-Forwarded-For'; nginx needs " +
                "'proxy_set_header X-Forwarded-For $remote_addr;'. Then confirm the rule tester " +
                "reports a plausible country before relying on any rule.",
        });
    }
    if (after.enabled && !after.adminBypass && before.adminBypass) {
        add({
            code: "ADMIN_BYPASS_REMOVED",
            severity: "WARNING",
            forceable: true,
            settingKey: K.adminBypass,
            title: "Administrators will be subject to the restrictions too",
            detail: "Staff connecting from a restricted country will lose the admin panel along with " +
                "everything else. The geographic restriction pages themselves stay reachable — they " +
                "are permanently exempt precisely so a bad rule can be undone — but nothing else " +
                "under /admin will be.",
            remedy: "Add your office and monitoring addresses to the always-allowed IP list first, so " +
                "there is a route in that does not depend on this switch.",
        });
    }
    if (after.enabled && !after.allowAccountExit) {
        add({
            code: "ACCOUNT_EXIT_CLOSED",
            severity: "WARNING",
            forceable: true,
            settingKey: K.allowAccountExit,
            title: "Existing customers in restricted countries cannot reach their money",
            detail: "With this off, a customer who already holds a balance cannot sign in, complete " +
                "verification, contact support or withdraw. Their funds stay on the platform with no " +
                "route out, which is usually a larger legal problem than the one the restriction " +
                "solves. It also closes the sign-in route that administrators rely on to recover " +
                "from a bad rule.",
            remedy: "Leave this on unless counsel has specifically told you to freeze restricted accounts.",
        });
    }
    if (after.enabled && after.ipAllowlist.length === 0) {
        add({
            code: "NO_IP_ESCAPE_HATCH",
            severity: "WARNING",
            forceable: true,
            settingKey: K.ipAllowlist,
            title: "No always-allowed IP addresses are configured",
            detail: "The IP allowlist is checked before every country rule and before the unknown-country " +
                "switch, so an address on it can always reach the platform whatever else is " +
                "misconfigured. With the list empty, recovery from a bad rule depends entirely on the " +
                "admin exemption still working.",
            remedy: "Add your office address, and your monitoring system's address, under Exceptions.",
        });
    }
    if (after.enabled &&
        after.blockAnonymizedIps &&
        !PROVIDERS_WITH_ANONYMITY_FLAGS.has(after.lookupProvider)) {
        add({
            code: "ANONYMIZER_BLOCK_INERT",
            severity: "WARNING",
            forceable: true,
            settingKey: K.blockAnonymizedIps,
            title: "VPN and proxy blocking will not actually do anything",
            detail: after.lookupProvider === "NONE"
                ? "Blocking anonymised connections needs a provider that reports proxy/hosting/Tor " +
                    "flags, and no IP lookup provider is configured. CDN country headers do not carry " +
                    "these flags, so nothing will ever be recognised as a VPN."
                : `${after.lookupProvider} does not return proxy, hosting or Tor flags, so no ` +
                    `connection will ever be recognised as anonymised.`,
            remedy: "Switch the provider to ip-api.com or ipinfo.io, or turn this off.",
        });
    }
    if (after.enabled && !after.failOpen && after.blockUnknownCountry) {
        add({
            code: "DOUBLE_FAIL_CLOSED",
            severity: "WARNING",
            forceable: true,
            settingKey: K.failOpen,
            title: "Every uncertainty now results in a refusal",
            detail: "Unknown countries are refused and engine failures are refused. A database outage at " +
                "start-up, or a lapsed lookup provider, would take the whole platform offline behind a " +
                "compliance notice rather than an error page — which is considerably harder to " +
                "diagnose, because it looks like the feature working correctly.",
            remedy: "Keep the always-allowed IP list populated, and make sure your uptime monitor checks " +
                "for the notice page rather than only for an HTTP status.",
        });
    }
    if (!after.enabled && rules.length > 0 && before.enabled) {
        add({
            code: "ENFORCEMENT_DISABLED_WITH_RULES",
            severity: "WARNING",
            forceable: true,
            settingKey: K.enabled,
            title: `${rules.length} country rule${rules.length === 1 ? "" : "s"} will stop being applied`,
            detail: "The rules stay saved but nothing is enforced — restricted countries regain full " +
                "access immediately, including registration and deposits.",
            remedy: "If you meant to relax one jurisdiction rather than all of them, retire that country's " +
                "rule instead and leave enforcement on.",
        });
    }
    const lockouts = findings.filter((f) => f.severity === "LOCKOUT");
    const hardLockouts = lockouts.filter((f) => !f.forceable);
    return {
        findings,
        lockouts,
        hardLockouts,
        warnings: findings.filter((f) => f.severity === "WARNING"),
        safe: lockouts.length === 0,
    };
}
function preflightBlocksSave(result, force) {
    if (result.hardLockouts.length)
        return result.hardLockouts;
    if (force)
        return [];
    return result.lockouts;
}
function formatPreflightRefusal(blocking, forceable) {
    const lines = blocking.map((f, i) => `${i + 1}. ${f.title}\n   ${f.detail}\n   → ${f.remedy}`);
    const tail = forceable
        ? "\n\nIf this is genuinely what you intend, re-submit with \"force\": true."
        : "\n\nThis cannot be overridden: the configuration refuses every request, so the " +
            "restriction rules would never be reached.";
    return `This change was not saved.\n\n${lines.join("\n\n")}${tail}`;
}
