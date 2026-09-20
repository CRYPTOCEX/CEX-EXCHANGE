"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Reports which currency icons are missing from /img/crypto",
    operationId: "getMissingCurrencyIcons",
    tags: ["Admin", "System", "Icons"],
    description: "Scans every catalog table that defines a tradable asset, normalizes each symbol the " +
        "same way the frontend does, and reports the ones with no icon file — including files " +
        "that exist but are byte-identical copies of generic.webp, which render as a blank " +
        "placeholder and would otherwise look present. Read-only: it resolves offline sources " +
        "only and writes nothing.",
    parameters: [
        {
            name: "enabledOnly",
            in: "query",
            description: "Restrict to symbols on ENABLED rows — the icons a user can actually see today. " +
                "Most imported currencies are created disabled, so the full list is largely latent.",
            required: false,
            schema: { type: "boolean" },
        },
        {
            name: "page",
            in: "query",
            description: "1-based page of per-symbol rows. Clamped to the last page.",
            required: false,
            schema: { type: "integer", minimum: 1 },
        },
        {
            name: "perPage",
            in: "query",
            description: "Rows per page (default 25, max 200).",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 200 },
        },
        {
            name: "search",
            in: "query",
            description: "Substring match over symbol, catalog name, source and detail.",
            required: false,
            schema: { type: "string" },
        },
        {
            name: "bucket",
            in: "query",
            description: "Restrict rows to one asset class: cex, eco, fiat or fx.",
            required: false,
            schema: { type: "string", enum: ["all", "cex", "eco", "fiat", "fx"] },
        },
        {
            name: "outcome",
            in: "query",
            description: "Restrict rows to one resolution outcome.",
            required: false,
            schema: {
                type: "string",
                enum: ["all", "written", "would-write", "ambiguous", "unresolved", "convert-failed"],
            },
        },
        {
            name: "sort",
            in: "query",
            description: "Row order. Defaults to worst outcome first.",
            required: false,
            schema: { type: "string", enum: ["outcome", "symbol", "bucket", "source"] },
        },
        {
            name: "dir",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["asc", "desc"] },
        },
        {
            name: "refresh",
            in: "query",
            description: "Rescan instead of answering from the cached report. The scan is a process " +
                "spawn, so paging and filtering reuse the last one for up to 60 seconds.",
            required: false,
            schema: { type: "boolean" },
        },
    ],
    responses: {
        200: {
            description: "Missing-icon report",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            missing: { type: "number", description: "Total symbols with no usable icon" },
                            missingByBucket: { type: "object", description: "Counts per asset class" },
                            existingIcons: { type: "number" },
                            placeholderIcons: {
                                type: "number",
                                description: "Files that exist but are copies of generic.webp",
                            },
                            totalSymbols: { type: "number" },
                            stats: { type: "object" },
                            bySource: { type: "object", description: "Which resolver could supply each icon" },
                            byOutcome: { type: "object" },
                            items: { type: "array", items: { type: "object" } },
                            truncated: { type: "boolean" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.currency.icon",
    logModule: "ADMIN_SYSTEM",
    logTitle: "Currency Icon Report",
};
exports.default = async (data) => {
    var _a, _b;
    const { query, ctx } = data;
    const enabledOnly = String((_a = query === null || query === void 0 ? void 0 : query.enabledOnly) !== null && _a !== void 0 ? _a : "") === "true";
    const refresh = String((_b = query === null || query === void 0 ? void 0 : query.refresh) !== null && _b !== void 0 ? _b : "") === "true";
    const num = (v, fallback) => {
        const n = parseInt(String(v !== null && v !== void 0 ? v : ""), 10);
        return Number.isFinite(n) ? n : fallback;
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Scanning catalog tables and the icon directory");
    try {
        const { report, cachedAt, fromCache } = await (0, utils_1.getIconReport)({ enabledOnly, noNetwork: true, timeoutMs: 60000 }, refresh);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`${report.missing} missing icons across ${report.totalSymbols} symbols`);
        return {
            ...(0, utils_1.summarize)(report, {
                page: num(query === null || query === void 0 ? void 0 : query.page, 1),
                perPage: num(query === null || query === void 0 ? void 0 : query.perPage, num(query === null || query === void 0 ? void 0 : query.sample, 25)),
                search: (query === null || query === void 0 ? void 0 : query.search) ? String(query.search) : undefined,
                bucket: (query === null || query === void 0 ? void 0 : query.bucket) ? String(query.bucket) : undefined,
                outcome: (query === null || query === void 0 ? void 0 : query.outcome) ? String(query.outcome) : undefined,
                sort: (query === null || query === void 0 ? void 0 : query.sort) ? String(query.sort) : undefined,
                dir: (query === null || query === void 0 ? void 0 : query.dir) ? String(query.dir) : undefined,
            }),
            scannedAt: new Date(cachedAt).toISOString(),
            fromCache,
        };
    }
    catch (e) {
        if (e instanceof utils_1.IconSyncError) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(e.message);
            throw { statusCode: 500, message: e.detail ? `${e.message}: ${e.detail}` : e.message };
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail((e === null || e === void 0 ? void 0 : e.message) || "Icon report failed");
        throw { statusCode: 500, message: (e === null || e === void 0 ? void 0 : e.message) || "Icon report failed" };
    }
};
