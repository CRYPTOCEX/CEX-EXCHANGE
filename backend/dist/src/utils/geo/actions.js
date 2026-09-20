"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEO_UNCLASSIFIED_ALLOWLIST = exports.GEO_ACTION_PREFIXES = exports.GEO_ACCOUNT_EXIT_PREFIXES = exports.GEO_EXEMPT_PREFIXES = exports.GEO_ACTION_LABELS = exports.GEO_ACTIONS = void 0;
exports.pathMatchesPrefix = pathMatchesPrefix;
exports.pathMatchesAny = pathMatchesAny;
exports.isExemptPath = isExemptPath;
exports.isAccountExitPath = isAccountExitPath;
exports.isCommitmentExit = isCommitmentExit;
exports.actionForPath = actionForPath;
exports.findUnclassifiedRoutes = findUnclassifiedRoutes;
exports.sanitizeActions = sanitizeActions;
exports.GEO_ACTIONS = [
    "REGISTER",
    "LOGIN",
    "TRADE",
    "DEPOSIT",
    "WITHDRAW",
    "KYC",
    "P2P",
    "INVEST",
    "SWAP",
];
exports.GEO_ACTION_LABELS = {
    REGISTER: "Create an account",
    LOGIN: "Sign in",
    TRADE: "Place trades",
    DEPOSIT: "Deposit funds",
    WITHDRAW: "Withdraw funds",
    KYC: "Submit identity verification",
    P2P: "Use P2P trading",
    INVEST: "Invest, stake or join token sales",
    SWAP: "Swap tokens on-chain (DEX)",
};
exports.GEO_EXEMPT_PREFIXES = [
    "/api/geo",
    "/api/health",
    "/api/settings",
    "/api/docs",
    "/api/auth/csrf",
    "/api/admin/system/license",
    "/api/admin/system/geo-restriction",
    "/uploads",
    "/api/finance/deposit/fiat/transfi/webhook",
    "/api/finance/withdraw/fiat/transfi/webhook",
];
exports.GEO_ACCOUNT_EXIT_PREFIXES = [
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/session",
    "/api/auth/otp",
    "/api/auth/reset",
    "/api/auth/verify",
    "/api/auth/pow",
    "/api/auth/role",
    "/api/auth/delete",
    "/api/user/profile",
    "/api/user/account",
    "/api/user/session",
    "/api/user/activity",
    "/api/user/notification",
    "/api/user/media",
    "/api/user/kyc",
    "/api/user/support",
    "/api/finance/wallet",
    "/api/finance/currency",
    "/api/finance/transaction",
    "/api/finance/withdraw",
    "/api/ecosystem/wallet",
    "/api/ecosystem/withdraw",
    "/api/ecosystem/token",
];
exports.GEO_ACTION_PREFIXES = [
    {
        action: "REGISTER",
        prefixes: ["/api/auth/register"],
    },
    {
        action: "LOGIN",
        prefixes: ["/api/auth/login", "/api/auth/otp/login"],
    },
    {
        action: "WITHDRAW",
        prefixes: [
            "/api/finance/withdraw",
            "/api/ecosystem/withdraw",
            "/api/forex/withdraw",
        ],
    },
    {
        action: "DEPOSIT",
        prefixes: [
            "/api/finance/deposit",
            "/api/ecosystem/deposit",
            "/api/forex/deposit",
            "/api/forex-trading/account",
        ],
    },
    {
        action: "KYC",
        prefixes: ["/api/user/kyc"],
    },
    {
        action: "P2P",
        prefixes: ["/api/p2p"],
    },
    {
        action: "SWAP",
        prefixes: ["/api/dex", "/api/ext/dex"],
    },
    {
        action: "TRADE",
        prefixes: [
            "/api/exchange/order",
            "/api/exchange/binary/order",
            "/api/exchange/trading",
            "/api/ecosystem/order",
            "/api/futures/order",
            "/api/futures/position",
            "/api/forex-trading/order",
            "/api/copy-trading",
            "/api/trading-bot",
            "/api/hb",
        ],
    },
    {
        action: "INVEST",
        prefixes: [
            "/api/finance/investment",
            "/api/investment",
            "/api/staking",
            "/api/ico",
            "/api/ai/investment",
            "/api/nft",
            "/api/ecommerce",
        ],
    },
];
function pathMatchesPrefix(path, prefix) {
    if (!path || !prefix)
        return false;
    if (path === prefix)
        return true;
    return path.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`);
}
function pathMatchesAny(path, prefixes) {
    for (const prefix of prefixes) {
        if (pathMatchesPrefix(path, prefix))
            return true;
    }
    return false;
}
function isExemptPath(path) {
    return pathMatchesAny(path, exports.GEO_EXEMPT_PREFIXES);
}
function isAccountExitPath(path) {
    return pathMatchesAny(path, exports.GEO_ACCOUNT_EXIT_PREFIXES);
}
function isCommitmentExit(path, method) {
    const verb = String(method || "").toUpperCase();
    if (verb === "DELETE") {
        if (/\/(order|position)(\/|$)/.test(path))
            return true;
    }
    if (verb === "GET" && /\/(order|position)(\/|$)/.test(path))
        return true;
    if (verb === "POST" || verb === "PUT" || verb === "PATCH") {
        if (/\/(cancel|close|unstake|redeem|release|dispute|remove-funds|pause)(\/|$)/.test(path)) {
            return true;
        }
        if (/\/position\/[^/]+\/withdraw(\/|$)/.test(path))
            return true;
    }
    return false;
}
function actionForPath(path) {
    if (/\/account\/[^/]+\/withdraw(\/|$)/.test(path))
        return "WITHDRAW";
    if (/\/account\/[^/]+\/deposit(\/|$)/.test(path))
        return "DEPOSIT";
    for (const { action, prefixes } of exports.GEO_ACTION_PREFIXES) {
        if (pathMatchesAny(path, prefixes))
            return action;
    }
    return null;
}
exports.GEO_UNCLASSIFIED_ALLOWLIST = [
    "/api/admin",
    "/api/user",
    "/api/auth",
    "/api/blog",
    "/api/content",
    "/api/faq",
    "/api/news",
    "/api/public",
    "/api/announcement",
    "/api/currency",
    "/api/settings",
    "/api/geo",
    "/api/upload",
    "/api/search",
    "/api/finance/currency",
    "/api/finance/exchange-rate",
    "/api/finance/transaction",
    "/api/exchange/market",
    "/api/exchange/ticker",
    "/api/exchange/chart",
    "/api/exchange/currency",
    "/api/exchange/binary",
    "/api/exchange/news",
    "/api/exchange/orderbook",
    "/api/exchange/watchlist",
    "/api/exchange/alert",
    "/api/futures/funding",
    "/api/finance/wallet",
    "/api/forex/landing",
    "/api/forex/overview",
    "/api/forex/signal",
    "/api/forex/stats",
    "/api/forex/transaction",
    "/api/ecosystem/market",
    "/api/ecosystem/ticker",
    "/api/ecosystem/chart",
    "/api/ecosystem/token",
    "/api/futures/market",
    "/api/futures/ticker",
    "/api/futures/chart",
    "/api/forex/plan",
    "/api/forex/duration",
    "/api/forex-trading/market",
    "/api/forex-trading/ticker",
    "/api/forex-trading/chart",
    "/api/forex-trading/calendar",
    "/api/forex-trading/news",
    "/api/affiliate",
    "/api/ai/support",
    "/api/gateway",
    "/api/ecosystem/wallet",
    "/api/finance/ramp",
    "/api/finance/transfer",
    "/api/forex-trading/position",
    "/api/forex-trading/deal",
    "/api/forex/account",
    "/api/forex/investment",
];
function findUnclassifiedRoutes(routePaths) {
    return routePaths.filter((p) => !isExemptPath(p) &&
        !actionForPath(p) &&
        !pathMatchesAny(p, exports.GEO_UNCLASSIFIED_ALLOWLIST));
}
function sanitizeActions(value) {
    const raw = Array.isArray(value)
        ? value
        : typeof value === "string" && value.trim()
            ? value.split(/[\s,]+/)
            : [];
    const seen = new Set();
    for (const entry of raw) {
        const key = String(entry).trim().toUpperCase();
        if (exports.GEO_ACTIONS.includes(key))
            seen.add(key);
    }
    return Array.from(seen);
}
