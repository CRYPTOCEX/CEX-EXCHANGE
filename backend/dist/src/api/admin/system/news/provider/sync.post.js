"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const errors_1 = require("@b/utils/schema/errors");
const sync_1 = require("@b/utils/news/sync");
exports.metadata = {
    summary: "Runs the market news sync now",
    operationId: "syncMarketNewsNow",
    tags: ["Admin", "System", "News"],
    description: "Runs the same job the scheduler runs every 15 minutes, immediately, and reports what each enabled provider did. " +
        "IDENTICAL to the scheduled run — same code path, same de-duplication, same pruning — so what it reports is what the schedule will keep doing. " +
        "Safe to press repeatedly: stories already stored are matched on their provider-scoped external id and are never duplicated or overwritten, and operator-authored stories are never touched.",
    responses: {
        200: {
            description: "Sync completed",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            news: { type: "number" },
                            results: { type: "array", items: { type: "object" } },
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.market.news",
    logModule: "ADMIN_NEWS",
    logTitle: "Sync market news",
};
exports.default = async (data) => {
    var _a, _b;
    const { ctx } = data;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Running every enabled market news provider");
    const summary = await (0, sync_1.syncAllNewsProviders)();
    const failed = summary.results.filter((result) => result.status === "ERROR");
    const skipped = summary.results.filter((result) => result.status === "SKIPPED");
    const message = summary.results.length === 0
        ? "No provider is enabled, so nothing was fetched. Operator-authored stories still serve the feed."
        : `${summary.news} new ${summary.news === 1 ? "story" : "stories"} from ` +
            `${summary.results.length} ${summary.results.length === 1 ? "provider" : "providers"}` +
            (failed.length > 0 ? `, ${failed.length} failed` : "") +
            (skipped.length > 0 ? `, ${skipped.length} skipped` : "") +
            ".";
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, message);
    return { ...summary, message };
};
