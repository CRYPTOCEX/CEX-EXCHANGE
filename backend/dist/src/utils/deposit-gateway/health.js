"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_GATEWAY_ALIASES = void 0;
exports.resolvePublicUrl = resolvePublicUrl;
exports.describeGatewayHealth = describeGatewayHealth;
const registry_1 = require("./registry");
function resolvePublicUrl() {
    var _a, _b, _c;
    const candidate = ((_a = process.env.APP_PUBLIC_URL) === null || _a === void 0 ? void 0 : _a.trim()) ||
        ((_b = process.env.NEXT_PUBLIC_SITE_URL) === null || _b === void 0 ? void 0 : _b.trim()) ||
        ((_c = process.env.FRONTEND_URL) === null || _c === void 0 ? void 0 : _c.trim()) ||
        "http://localhost:3000";
    return candidate.replace(/\/+$/, "");
}
function readPrefix(value) {
    const prefixed = value.match(/^([a-z]{2,6}_(?:test|live|sandbox))/i);
    if (prefixed)
        return prefixed[1];
    const bare = value.match(/^((?:test|live|sandbox)_)/i);
    if (bare)
        return bare[1].replace(/_$/, "");
    return null;
}
function isTruthyFlag(value) {
    return /^(1|true|yes|on)$/i.test((value || "").trim());
}
function credentialState(credential) {
    var _a;
    const raw = ((_a = process.env[credential.key]) === null || _a === void 0 ? void 0 : _a.trim()) || "";
    const set = raw.length > 0;
    const echoable = credential.kind === "url" ||
        credential.kind === "flag" ||
        credential.kind === "public";
    return {
        ...credential,
        set,
        value: set && echoable ? raw : null,
        prefix: set && !echoable ? readPrefix(raw) : null,
    };
}
function resolveMode(profile, credentials, sandbox) {
    var _a;
    const anyCredential = credentials.some((credential) => credential.set &&
        credential.kind !== "flag" &&
        credential.kind !== "url");
    if (!anyCredential)
        return "unknown";
    const baseUrlKey = (_a = profile.credentials.find((credential) => credential.kind === "text" && /BASE_URL$/.test(credential.key))) === null || _a === void 0 ? void 0 : _a.key;
    if (baseUrlKey) {
        const baseUrl = (process.env[baseUrlKey] || "").toLowerCase();
        if (baseUrl)
            return /sandbox|test|staging/.test(baseUrl) ? "test" : "live";
    }
    if (sandbox === true)
        return "test";
    for (const credential of credentials) {
        const marker = (credential.prefix || credential.value || "").toLowerCase();
        if (!marker)
            continue;
        if (marker.includes("live"))
            return "live";
        if (marker.includes("test") || marker.includes("sandbox"))
            return "test";
    }
    if (profile.sandboxKey === "APP_ADYEN_ENVIRONMENT") {
        const environment = (process.env.APP_ADYEN_ENVIRONMENT || "").toLowerCase();
        if (environment === "live")
            return "live";
        if (environment === "test")
            return "test";
    }
    if (sandbox === false)
        return "live";
    return "unknown";
}
function describeGatewayHealth(row) {
    const publicUrl = resolvePublicUrl();
    const profile = (0, registry_1.getGatewayProfile)(row);
    if (!profile) {
        return {
            alias: null,
            supported: false,
            credentials: [],
            missingRequired: [],
            credentialsComplete: false,
            missingInbound: [],
            inboundComplete: null,
            sandbox: null,
            mode: "unknown",
            webhookUrl: null,
            returnUrl: `${publicUrl}/finance/deposit`,
            publicUrl,
        };
    }
    const credentials = profile.credentials.map(credentialState);
    const missingRequired = credentials
        .filter((credential) => credential.required && !credential.set)
        .map((credential) => credential.key);
    const missingInbound = credentials
        .filter((credential) => credential.inboundRequired && !credential.set)
        .map((credential) => credential.key);
    const sandbox = profile.sandboxKey
        ? profile.sandboxKey === "APP_ADYEN_ENVIRONMENT"
            ? (process.env.APP_ADYEN_ENVIRONMENT || "test").toLowerCase() !== "live"
            : isTruthyFlag(process.env[profile.sandboxKey])
        : null;
    const overrideFor = (role) => { var _a; return ((_a = credentials.find((credential) => credential.kind === "url" && credential.role === role && credential.set)) === null || _a === void 0 ? void 0 : _a.value) || null; };
    const webhookPath = overrideFor("webhook") || profile.webhookPath || null;
    const returnPath = overrideFor("return") || profile.returnPath;
    const absolute = (path) => /^https?:\/\//i.test(path) ? path : `${publicUrl}${path}`;
    return {
        alias: profile.alias,
        supported: true,
        credentials,
        missingRequired,
        credentialsComplete: missingRequired.length === 0,
        missingInbound,
        inboundComplete: profile.webhookPath ? missingInbound.length === 0 : null,
        sandbox,
        mode: resolveMode(profile, credentials, sandbox),
        webhookUrl: webhookPath ? absolute(webhookPath) : null,
        returnUrl: absolute(returnPath),
        publicUrl,
    };
}
exports.SUPPORTED_GATEWAY_ALIASES = Object.keys(registry_1.GATEWAY_PROFILES);
