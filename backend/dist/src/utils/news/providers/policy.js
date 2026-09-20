"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsProviderCredentials = newsProviderCredentials;
exports.resolveNewsCredential = resolveNewsCredential;
exports.missingNewsCredentials = missingNewsCredentials;
exports.newsProviderConfigProblem = newsProviderConfigProblem;
exports.readinessFor = readinessFor;
exports.normaliseFetchLimit = normaliseFetchLimit;
exports.normaliseCategories = normaliseCategories;
const constants_1 = require("./constants");
const coerce_1 = require("./coerce");
const catalog_1 = require("./catalog");
function newsProviderCredentials(name) {
    var _a;
    return (_a = constants_1.NEWS_PROVIDER_CREDENTIALS[name]) !== null && _a !== void 0 ? _a : [];
}
function resolveNewsCredential(name, storedKey) {
    var _a;
    const required = newsProviderCredentials(name);
    if (required.length === 0)
        return { apiKey: "", source: "none" };
    const stored = String(storedKey !== null && storedKey !== void 0 ? storedKey : "").trim();
    if (stored)
        return { apiKey: stored, source: "stored" };
    const fromEnv = String((_a = process.env[required[0]]) !== null && _a !== void 0 ? _a : "").trim();
    if (fromEnv)
        return { apiKey: fromEnv, source: "environment" };
    return { apiKey: "", source: "none" };
}
function missingNewsCredentials(name, storedKey) {
    if (resolveNewsCredential(name, storedKey).source !== "none")
        return [];
    return newsProviderCredentials(name);
}
function newsProviderConfigProblem(name, config) {
    if (name === "rss") {
        return (0, coerce_1.readFeeds)(config !== null && config !== void 0 ? config : {}).length === 0
            ? "No feed URLs are configured. Add at least one http(s) RSS or Atom URL below."
            : null;
    }
    return null;
}
function readinessFor(name, config, adapterAvailable, storedKey) {
    if (!adapterAvailable) {
        return {
            adapterAvailable: false,
            missingCredentials: [],
            configProblem: null,
            credentialSource: "none",
            ready: false,
        };
    }
    const { source } = resolveNewsCredential(name, storedKey);
    const missingCredentials = missingNewsCredentials(name, storedKey);
    const configProblem = newsProviderConfigProblem(name, config);
    return {
        adapterAvailable: true,
        missingCredentials,
        configProblem,
        credentialSource: source,
        ready: missingCredentials.length === 0 && !configProblem,
    };
}
function normaliseFetchLimit(raw) {
    const value = Number(raw);
    if (!Number.isFinite(value))
        return 60;
    return Math.min(Math.max(1, Math.trunc(value)), 500);
}
function safeParseArray(raw) {
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    }
    catch (_a) {
        return null;
    }
}
function normaliseCategories(name, raw) {
    var _a;
    var _b;
    const source = typeof raw === "string" ? safeParseArray(raw) : raw;
    const list = Array.isArray(source)
        ? source.map((entry) => String(entry).trim()).filter(Boolean).slice(0, 25)
        : [];
    if (list.length > 0)
        return list;
    if (name === "finnhub") {
        return (_b = (_a = (0, catalog_1.newsProviderProfile)("finnhub")) === null || _a === void 0 ? void 0 : _a.defaultCategories) !== null && _b !== void 0 ? _b : ["crypto"];
    }
    return [];
}
