"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Fetches the missing currency icons and writes them as 64x64 webp",
    operationId: "syncCurrencyIcons",
    tags: ["Admin", "System", "Icons"],
    description: "Resolves each missing symbol through the chain local-blockchains -> alias -> trustwallet " +
        "-> tokenlist -> coingecko -> flag -> alias-word and writes 64x64 alpha webp files into " +
        "frontend/public/img/crypto, matching the existing icon convention. Idempotent: a symbol " +
        "that already has a real icon is skipped, so re-running only fills what is still missing. " +
        "Fiat codes always resolve to a flag and are never given a crypto logo. Because the request " +
        "is synchronous, use `limit` to keep a run inside the timeout — a full backfill of ~2,000 " +
        "icons should be run from the CLI (npm run icons:sync).",
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        enabledOnly: {
                            type: "boolean",
                            description: "Only symbols on ENABLED rows — the small set a user can actually see. Recommended.",
                        },
                        buckets: {
                            type: "array",
                            items: { type: "string", enum: ["cex", "eco", "fiat", "fx"] },
                            description: "Asset classes to include. Defaults to cex, eco and fiat.",
                        },
                        sources: {
                            type: "array",
                            items: {
                                type: "string",
                                enum: [
                                    "local-blockchains",
                                    "alias",
                                    "trustwallet",
                                    "tokenlist",
                                    "coingecko",
                                    "flag",
                                    "alias-word",
                                ],
                            },
                            description: "Restrict the resolution chain. Defaults to all of it.",
                        },
                        symbols: {
                            type: "array",
                            items: { type: "string" },
                            description: "Specific symbols to fix, up to 200. Overrides `buckets`.",
                        },
                        noNetwork: {
                            type: "boolean",
                            description: "Offline only (local-blockchains + alias). Fast and cannot be rate limited.",
                        },
                        overwrite: {
                            type: "boolean",
                            description: "Also re-resolve symbols that already have a good icon, replacing the file.",
                        },
                        limit: {
                            type: "integer",
                            minimum: 0,
                            description: "Stop after this many successful writes. Default 200.",
                        },
                        timeoutMs: {
                            type: "integer",
                            description: "Give up after this long. Default 120000, max 900000.",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Sync result",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            applied: { type: "boolean" },
                            stats: { type: "object", description: "written / unresolved / ambiguous / failed" },
                            bySource: { type: "object", description: "How many icons each resolver supplied" },
                            missing: { type: "number", description: "Missing count BEFORE this run" },
                            items: { type: "array", items: { type: "object" } },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.currency.icon",
    logModule: "ADMIN_SYSTEM",
    logTitle: "Sync Currency Icons",
};
exports.default = async (data) => {
    var _a, _b;
    var _c, _d, _e, _f;
    const { body, ctx } = data;
    const b = (body || {});
    const limitRaw = parseInt(String((_c = b.limit) !== null && _c !== void 0 ? _c : ""), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 0), 5000) : 200;
    const timeoutRaw = parseInt(String((_d = b.timeoutMs) !== null && _d !== void 0 ? _d : ""), 10);
    const timeoutMs = Number.isFinite(timeoutRaw) ? timeoutRaw : 120000;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Resolving up to ${limit} missing icons`);
    try {
        const report = await (0, utils_1.runIconSync)({
            apply: true,
            enabledOnly: !!b.enabledOnly,
            noNetwork: !!b.noNetwork,
            overwrite: !!b.overwrite,
            buckets: Array.isArray(b.buckets) ? b.buckets.map(String) : undefined,
            sources: Array.isArray(b.sources) ? b.sources.map(String) : undefined,
            symbols: Array.isArray(b.symbols) ? b.symbols.map(String) : undefined,
            limit,
            timeoutMs,
        });
        const wrote = (_e = (_a = report.stats) === null || _a === void 0 ? void 0 : _a.written) !== null && _e !== void 0 ? _e : 0;
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Wrote ${wrote} icons (${(_f = (_b = report.stats) === null || _b === void 0 ? void 0 : _b.unresolved) !== null && _f !== void 0 ? _f : 0} unresolved)`);
        (0, utils_1.invalidateIconReport)();
        return {
            ...(0, utils_1.summarize)(report, { perPage: 50 }),
            message: wrote > 0
                ? `Wrote ${wrote} icon${wrote === 1 ? "" : "s"}. ` +
                    `${report.stats.unresolved} could not be resolved from any source.`
                : "No icons were written — nothing in scope could be resolved.",
        };
    }
    catch (e) {
        if (e instanceof utils_1.IconSyncError) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(e.message);
            throw { statusCode: 500, message: e.detail ? `${e.message}: ${e.detail}` : e.message };
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail((e === null || e === void 0 ? void 0 : e.message) || "Icon sync failed");
        throw { statusCode: 500, message: (e === null || e === void 0 ? void 0 : e.message) || "Icon sync failed" };
    }
};
