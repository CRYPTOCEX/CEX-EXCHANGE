"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cronMode = cronMode;
exports.shouldRegisterCronJobs = shouldRegisterCronJobs;
exports.isCronOnlyProcess = isCronOnlyProcess;
exports.isCronDelegated = isCronDelegated;
exports.fxVenueCronsWouldDuplicate = fxVenueCronsWouldDuplicate;
exports.aiMarketMakerHasNoEngineHost = aiMarketMakerHasNoEngineHost;
exports.tradingBotHasNoEngineHost = tradingBotHasNoEngineHost;
exports.copyTradingMatcherCallsWouldFail = copyTradingMatcherCallsWouldFail;
exports.cronOnlyLimitations = cronOnlyLimitations;
exports.logCronMode = logCronMode;
const console_1 = require("@b/utils/console");
let resolved = null;
function resolve() {
    if (resolved)
        return resolved;
    const raw = (process.env.CRON_MODE || "").trim().toLowerCase();
    if (raw === "" || raw === "inline") {
        resolved = "inline";
    }
    else if (raw === "off") {
        resolved = "off";
    }
    else if (raw === "only") {
        resolved = "only";
    }
    else {
        console_1.logger.error("CRON", `CRON_MODE="${process.env.CRON_MODE}" is not recognised. Valid values are ` +
            `"inline" (default), "off", "only". Falling back to "inline" — this process ` +
            `WILL run cron jobs. Fix the value if you intended to move cron to its own process.`);
        resolved = "inline";
    }
    return resolved;
}
function cronMode() {
    return resolve();
}
function shouldRegisterCronJobs() {
    return resolve() !== "off";
}
function isCronOnlyProcess() {
    return resolve() === "only";
}
function isCronDelegated() {
    return resolve() === "off";
}
const CRON_ONLY_LIMITATIONS = [
    {
        extension: "ai_market_maker",
        refusedJobs: [],
        reason: "the `ecosystem` extension is NOT enabled, so no process in this deployment boots an " +
            "ecosystem matcher at all. The market maker trades ecosystem markets, so with no matcher " +
            "there is nothing for it to quote — this is not about WHERE the engine runs.",
        impact: "market making is not running anywhere in this deployment: no quotes, no bot orders, and " +
            "no engine-written 1-minute candles for anything that settles off them. The other six AI " +
            "market maker crons (risk monitor, pool rebalancer, daily reset, analytics, price sync, " +
            "history retention) DO run here and are unaffected.",
        fix: "enable the `ecosystem` extension, or disable `ai_market_maker`. This combination cannot " +
            "make markets whichever way cron is deployed — the market maker trades ecosystem markets.",
        stillApplies: async (enabled) => !enabled.has("ecosystem"),
    },
    {
        extension: "trading_bot",
        refusedJobs: [],
        reason: "the `ecosystem` extension is NOT enabled, so no process in this deployment boots an " +
            "ecosystem matcher at all. Trading bots trade ecosystem markets and price off ecosystem " +
            "candles, so there is nothing to trade — this is not about WHERE the engine runs.",
        impact: "no trading bot is running anywhere in this deployment: live bots place no orders, paper " +
            "bots do not tick, and no bot's stale-tick detector runs. The other three trading bot " +
            "crons (strategy ratings, daily stats aggregation, weekly cleanup) DO run here and are " +
            "unaffected.",
        fix: "enable the `ecosystem` extension, or disable `trading_bot`. This combination cannot trade " +
            "whichever way cron is deployed — bots trade ecosystem markets and price off ecosystem " +
            "candles, so even a PAPER bot has no price feed without it.",
        stillApplies: async (enabled) => !enabled.has("ecosystem"),
    },
];
const FX_VENUE_CHECK_TTL_MS = 60000;
let fxVenueCheck = null;
const FX_VENUE_CHECK_DEADLINE_MS = 2000;
let fxVenueCheckFailureLogged = false;
async function fxVenueCronsWouldDuplicate() {
    const now = Date.now();
    if (fxVenueCheck && now - fxVenueCheck.at < FX_VENUE_CHECK_TTL_MS) {
        return fxVenueCheck.blocked;
    }
    let deadline;
    try {
        const { models } = await Promise.resolve().then(() => __importStar(require("@b/db")));
        if (!(models === null || models === void 0 ? void 0 : models.fxExecutionProvider))
            return false;
        const expired = new Promise((_resolve, reject) => {
            var _a;
            deadline = setTimeout(() => reject(new Error(`fx execution provider check exceeded ${FX_VENUE_CHECK_DEADLINE_MS}ms`)), FX_VENUE_CHECK_DEADLINE_MS);
            (_a = deadline.unref) === null || _a === void 0 ? void 0 : _a.call(deadline);
        });
        const blocked = await Promise.race([
            (async () => {
                const enabled = await models.fxExecutionProvider.count({
                    where: { status: true },
                });
                if (enabled > 0)
                    return true;
                if (models.fxOrder && models.fxPosition) {
                    const [routing, openExternal] = await Promise.all([
                        models.fxOrder.count({
                            where: { routing: "EXTERNAL", status: "ROUTING" },
                        }),
                        models.fxPosition.count({
                            where: { routing: "EXTERNAL", status: "OPEN" },
                        }),
                    ]);
                    return routing > 0 || openExternal > 0;
                }
                return false;
            })(),
            expired,
        ]);
        fxVenueCheck = { at: now, blocked };
        fxVenueCheckFailureLogged = false;
        return blocked;
    }
    catch (error) {
        if (!fxVenueCheckFailureLogged) {
            fxVenueCheckFailureLogged = true;
            console_1.logger.error("CRON", "Could not determine whether an fx execution provider is participating; " +
                "assuming one is, so the venue-owning fx crons stay refused on this process. " +
                "This is logged once and stays silent until the check succeeds again.", error);
        }
        return true;
    }
    finally {
        if (deadline)
            clearTimeout(deadline);
    }
}
const AI_MM_HOST_CHECK_TTL_MS = 60000;
let aiMmHostCheck = null;
async function aiMarketMakerHasNoEngineHost() {
    if (!isCronOnlyProcess())
        return false;
    const now = Date.now();
    if (aiMmHostCheck && now - aiMmHostCheck.at < AI_MM_HOST_CHECK_TTL_MS) {
        return aiMmHostCheck.homeless;
    }
    try {
        const { CacheManager } = await Promise.resolve().then(() => __importStar(require("@b/utils/cache")));
        const extensions = await CacheManager.getInstance().getExtensions();
        const homeless = !extensions.has("ecosystem");
        aiMmHostCheck = { at: now, homeless };
        return homeless;
    }
    catch (error) {
        console_1.logger.error("CRON", "Could not read the enabled extensions to check whether the AI market maker engine has a " +
            "host process; assuming it does, so no refusal alert is raised this run.", error);
        return false;
    }
}
const TRADING_BOT_HOST_CHECK_TTL_MS = 60000;
let tradingBotHostCheck = null;
async function tradingBotHasNoEngineHost() {
    if (!isCronOnlyProcess())
        return false;
    const now = Date.now();
    if (tradingBotHostCheck &&
        now - tradingBotHostCheck.at < TRADING_BOT_HOST_CHECK_TTL_MS) {
        return tradingBotHostCheck.homeless;
    }
    try {
        const { CacheManager } = await Promise.resolve().then(() => __importStar(require("@b/utils/cache")));
        const extensions = await CacheManager.getInstance().getExtensions();
        const homeless = !extensions.has("ecosystem");
        tradingBotHostCheck = { at: now, homeless };
        return homeless;
    }
    catch (error) {
        console_1.logger.error("CRON", "Could not read the enabled extensions to check whether the trading bot engine has a " +
            "host process; assuming it does, so no refusal alert is raised this run.", error);
        return false;
    }
}
async function copyTradingMatcherCallsWouldFail() {
    if (!isCronOnlyProcess())
        return false;
    try {
        const { CacheManager } = await Promise.resolve().then(() => __importStar(require("@b/utils/cache")));
        const extensions = await CacheManager.getInstance().getExtensions();
        return extensions.has("ecosystem");
    }
    catch (error) {
        console_1.logger.error("CRON", "Could not read the enabled extensions to check whether the copy-trading stop monitor " +
            "would strand exit orders on this process; assuming it would, so the job stays refused.", error);
        return true;
    }
}
async function cronOnlyLimitations(enabledExtensions) {
    if (!isCronOnlyProcess())
        return [];
    const applying = [];
    for (const limitation of CRON_ONLY_LIMITATIONS) {
        if (!enabledExtensions.has(limitation.extension))
            continue;
        if (limitation.stillApplies &&
            !(await limitation.stillApplies(enabledExtensions))) {
            continue;
        }
        applying.push(limitation);
    }
    return applying;
}
function logCronMode() {
    const mode = resolve();
    if (mode === "inline")
        return;
    if (mode === "only") {
        console_1.logger.info("CRON", "CRON_MODE=only — this process runs the scheduler and serves no traffic. It is the " +
            "`cron` app in production.config.js, which also sets CRON_MODE=off on the web backend " +
            "so exactly one of the two registers jobs. Nothing to configure in .env.");
    }
    else {
        console_1.logger.info("CRON", "CRON_MODE=off — this process registers NO cron jobs. It is the `backend` app in " +
            "production.config.js, which starts the `cron` app alongside it. If `pm2 list` shows " +
            "no running `cron` process, NOTHING scheduled is running: start it with `pnpm start`.");
    }
}
