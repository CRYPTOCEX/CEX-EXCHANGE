"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordDecisionHealth = recordDecisionHealth;
exports.getDetectionHealth = getDetectionHealth;
exports.resetDetectionHealth = resetDetectionHealth;
exports.assessUnknownBlockBreaker = assessUnknownBlockBreaker;
exports.markBreakerTripped = markBreakerTripped;
exports.breakerTripped = breakerTripped;
exports.resetBreaker = resetBreaker;
const REASONS_WITHOUT_COUNTRY_RESOLUTION = new Set([
    "DISABLED",
    "EXEMPT_PATH",
    "IP_ALLOWLIST",
    "IP_BLOCKLIST",
    "ADMIN_BYPASS",
    "LOOKUP_FAILED_OPEN",
    "LOOKUP_FAILED_CLOSED",
]);
function emptyWindow(startedAt) {
    return {
        startedAt,
        evaluated: 0,
        resolved: 0,
        pending: 0,
        unknownBlocked: 0,
        bySource: {
            CDN_HEADER: 0,
            IP_LOOKUP: 0,
            KYC: 0,
            PROFILE: 0,
            MANUAL: 0,
            NONE: 0,
        },
    };
}
const WINDOW_MS = 300000;
let current = emptyWindow(Date.now());
let previous = emptyWindow(Date.now());
const sinceBoot = emptyWindow(Date.now());
function rotateIfDue(now) {
    if (now - current.startedAt < WINDOW_MS)
        return;
    previous = current;
    current = emptyWindow(now);
}
const evidence = {
    cdnHeaderObserved: false,
    cdnHeaderLastSeenAt: null,
    lookupObserved: false,
    lookupLastSeenAt: null,
    untrustedProxyObserved: false,
    privatePeerObserved: false,
    proxyProbes: 0,
};
const PROXY_HEADERS = [
    "x-forwarded-for",
    "cf-connecting-ip",
    "true-client-ip",
    "x-real-ip",
];
function looksPrivate(ip) {
    if (!ip)
        return true;
    const address = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
    if (address === "::1" || address === "127.0.0.1")
        return true;
    if (address.startsWith("10.") || address.startsWith("192.168."))
        return true;
    if (address.startsWith("169.254.") || address.startsWith("fe80:"))
        return true;
    if (address.startsWith("fc") || address.startsWith("fd"))
        return true;
    const octets = address.split(".");
    if (octets.length === 4) {
        const first = Number(octets[0]);
        const second = Number(octets[1]);
        if (first === 172 && second >= 16 && second <= 31)
            return true;
        if (first === 100 && second >= 64 && second <= 127)
            return true;
    }
    return false;
}
function probeProxyEvidence(ctx) {
    if (evidence.untrustedProxyObserved && evidence.privatePeerObserved)
        return;
    if (evidence.proxyProbes >= 64)
        return;
    evidence.proxyProbes++;
    if (looksPrivate(ctx.ip))
        evidence.privatePeerObserved = true;
    const headers = ctx.headers || {};
    const hasForwardingHeader = PROXY_HEADERS.some((name) => headers[name]);
    if (hasForwardingHeader && looksPrivate(ctx.ip)) {
        evidence.untrustedProxyObserved = true;
    }
}
function recordDecisionHealth(ctx, decision) {
    var _a;
    try {
        if (REASONS_WITHOUT_COUNTRY_RESOLUTION.has(decision.reasonCode))
            return;
        const now = Date.now();
        rotateIfDue(now);
        const location = decision.location;
        const source = location.source;
        for (const window of [current, sinceBoot]) {
            window.evaluated++;
            window.bySource[source] = ((_a = window.bySource[source]) !== null && _a !== void 0 ? _a : 0) + 1;
            if (location.countryCode)
                window.resolved++;
            else if (location.pending)
                window.pending++;
            if (decision.reasonCode === "UNKNOWN_COUNTRY_BLOCKED")
                window.unknownBlocked++;
        }
        if (location.countryCode) {
            if (source === "CDN_HEADER") {
                evidence.cdnHeaderObserved = true;
                evidence.cdnHeaderLastSeenAt = now;
            }
            else if (source === "IP_LOOKUP") {
                evidence.lookupObserved = true;
                evidence.lookupLastSeenAt = now;
            }
        }
        else {
            probeProxyEvidence(ctx);
        }
    }
    catch (_b) {
    }
}
function mergeWindows(a, b) {
    var _a, _b;
    const merged = emptyWindow(Math.min(a.startedAt, b.startedAt));
    merged.evaluated = a.evaluated + b.evaluated;
    merged.resolved = a.resolved + b.resolved;
    merged.pending = a.pending + b.pending;
    merged.unknownBlocked = a.unknownBlocked + b.unknownBlocked;
    for (const key of Object.keys(merged.bySource)) {
        merged.bySource[key] = ((_a = a.bySource[key]) !== null && _a !== void 0 ? _a : 0) + ((_b = b.bySource[key]) !== null && _b !== void 0 ? _b : 0);
    }
    return merged;
}
function getDetectionHealth() {
    rotateIfDue(Date.now());
    const recent = mergeWindows(previous, current);
    return {
        evidence: { ...evidence },
        recent,
        sinceBoot: { ...sinceBoot, bySource: { ...sinceBoot.bySource } },
        resolutionRate: recent.evaluated ? recent.resolved / recent.evaluated : null,
        noCountryEverResolved: sinceBoot.resolved === 0 &&
            !evidence.cdnHeaderObserved &&
            !evidence.lookupObserved,
    };
}
function resetDetectionHealth() {
    const now = Date.now();
    current = emptyWindow(now);
    previous = emptyWindow(now);
    Object.assign(sinceBoot, emptyWindow(now));
    Object.assign(evidence, {
        cdnHeaderObserved: false,
        cdnHeaderLastSeenAt: null,
        lookupObserved: false,
        lookupLastSeenAt: null,
        untrustedProxyObserved: false,
        privatePeerObserved: false,
        proxyProbes: 0,
    });
}
const BREAKER_MIN_EVALUATIONS = 50;
const BREAKER_MIN_ELAPSED_MS = 120000;
let breakerTrippedAt = null;
let processStartedAt = Date.now();
function assessUnknownBlockBreaker(policy, now = Date.now()) {
    const health = getDetectionHealth();
    const evaluated = health.sinceBoot.evaluated;
    const unknownBlocked = health.sinceBoot.unknownBlocked;
    const base = { evaluated, unknownBlocked };
    if (breakerTrippedAt !== null) {
        return { shouldTrip: false, reason: "already tripped this process", ...base };
    }
    if (!policy.enabled || !policy.blockUnknownCountry) {
        return { shouldTrip: false, reason: "switch not engaged", ...base };
    }
    if (now - processStartedAt < BREAKER_MIN_ELAPSED_MS) {
        return { shouldTrip: false, reason: "still warming up", ...base };
    }
    if (evaluated < BREAKER_MIN_EVALUATIONS) {
        return { shouldTrip: false, reason: "not enough traffic to be sure", ...base };
    }
    if (!health.noCountryEverResolved) {
        return { shouldTrip: false, reason: "country detection is working", ...base };
    }
    if (unknownBlocked === 0) {
        return { shouldTrip: false, reason: "nothing is being refused", ...base };
    }
    return {
        shouldTrip: true,
        reason: `country detection has never once succeeded (${evaluated} decisions since ` +
            `start-up, ${unknownBlocked} refused as unknown), so "block when the country ` +
            `cannot be determined" is refusing every visitor including administrators`,
        ...base,
    };
}
function markBreakerTripped(now = Date.now()) {
    breakerTrippedAt = now;
}
function breakerTripped() {
    return breakerTrippedAt;
}
function resetBreaker(startedAt = Date.now()) {
    breakerTrippedAt = null;
    processStartedAt = startedAt;
}
