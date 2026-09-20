"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyRestartScope = classifyRestartScope;
exports.scopeCoversRole = scopeCoversRole;
exports.isLazyCronModule = isLazyCronModule;
exports.devRestartSentinel = devRestartSentinel;
exports.touchRestartSentinel = touchRestartSentinel;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const process_role_1 = require("../process-role");
const SRC_ROOT = path_1.default.resolve(__dirname, "..", "..");
const IS_WINDOWS = process.platform === "win32";
function srcRelative(file) {
    const abs = path_1.default.resolve(file);
    const rel = path_1.default.relative(SRC_ROOT, abs);
    if (!rel || rel.startsWith("..") || path_1.default.isAbsolute(rel))
        return null;
    const posix = rel.split(path_1.default.sep).join("/");
    return IS_WINDOWS ? posix.toLowerCase() : posix;
}
const CROSSOVERS = {
    "api/finance/deposit/spot/index.ws.ts": "cron/jobs/wallet.ts imports it (spot deposit broadcasts)",
    "api/exchange/currency/index.get.ts": "cron/jobs/currency.ts imports it (currency listing reused by the price job)",
    "api/(ext)/ecosystem/market/index.ws.ts": "reachable from api/(ext)/ecosystem/utils/cron.ts",
    "api/(ext)/copy-trading/index.ws.ts": "reachable from api/(ext)/copy-trading/utils/cron.ts",
    "api/(ext)/p2p/trade/[id]/index.ws.ts": "reachable from api/(ext)/p2p/utils/cron.ts via p2p-trade-timeout.ts",
    "api/(ext)/admin/ai/market-maker/market/index.ws.ts": "reachable from the market maker engine, which follows the matching lease",
    "cron/jobs/currency.ts": "re-exported through the @b/cron barrel and called by " +
        "api/admin/finance/currency/spot/import.get.ts and (ext)/forex/account/transaction-handler.ts",
    "api/(ext)/forex/utils/cron.ts": "api/(ext)/admin/forex/investment/recover/index.post.ts calls processForexInvestment",
    "api/(ext)/p2p/utils/cron.ts": "api/(ext)/admin/p2p/trade/timeout/index.post.ts calls p2pTradeTimeout",
    "api/(ext)/ai/investment/utils/cron.ts": "api/(ext)/ai/investment/log/index.get.ts calls processAiInvestment",
};
const LAZY_CRON_MODULE = /(?:^|\/)utils\/cron\.ts$|^api\/finance\/investment\/cron\.ts$/;
const RULES = [
    [/^utils\/(?:dev\/|process-role\.ts$)/, "both", "the reloader's own machinery"],
    [/^cron\/jobs\//, "cron", "a core cron job body"],
    [LAZY_CRON_MODULE, "cron", "an addon cron job body"],
    [/^cron\//, "both", "the cron registry/mode/broadcast, which both tiers read"],
    [/^api\/.*\.ws\.ts$/, "web", "a WebSocket handler"],
    [
        /^api\/.*\.(?:get|post|put|patch|del|delete|options|head)\.ts$/,
        "web",
        "an HTTP route endpoint",
    ],
];
function classifyRestartScope(file) {
    const rel = srcRelative(file);
    if (rel === null)
        return { scope: "both", why: "outside backend/src" };
    const crossover = CROSSOVERS[rel];
    if (crossover)
        return { scope: "both", why: `both tiers use it — ${crossover}` };
    for (const [pattern, scope, why] of RULES) {
        if (pattern.test(rel))
            return { scope, why };
    }
    return { scope: "both", why: "no rule claims it, so it is assumed shared" };
}
function scopeCoversRole(scope, role) {
    if (role === "inline")
        return true;
    return scope === "both" || scope === role;
}
function isLazyCronModule(file) {
    const rel = srcRelative(file);
    return rel !== null && !CROSSOVERS[rel] && LAZY_CRON_MODULE.test(rel);
}
function devRestartSentinel(role = (0, process_role_1.processRole)()) {
    const name = role === "web"
        ? "dev-restart.web.json"
        : role === "cron"
            ? "dev-restart.cron.json"
            : "dev-restart.json";
    return path_1.default.join(process_role_1.BACKEND_ROOT, name);
}
function touchRestartSentinel(reason, role) {
    try {
        fs_1.default.writeFileSync(devRestartSentinel(role), `${JSON.stringify({ role: role || (0, process_role_1.processRole)(), requestedAt: new Date().toISOString(), reason }, null, 2)}\n`);
        return true;
    }
    catch (_a) {
        return false;
    }
}
