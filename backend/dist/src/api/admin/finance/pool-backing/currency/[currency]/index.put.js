"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Sets a currency's pool-backing overrides",
    description: "Per-currency cap and settle threshold (USD) overriding the global settings, the ecosystem-chain to exchange-network map, and operator notes. Null clears an override.",
    operationId: "updatePoolBackingCurrency",
    tags: ["Admin", "Finance", "Pool Backing"],
    requiresAuth: true,
    permission: "edit.pool.backing",
    logModule: "ADMIN_FIN",
    logTitle: "Update pool-backing currency settings",
    parameters: [
        { index: 0, name: "currency", in: "path", required: true, schema: { type: "string" } },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        capUsd: { type: "number", nullable: true },
                        thresholdUsd: { type: "number", nullable: true },
                        networkMap: { type: "object", nullable: true, description: "ecosystem chain id -> the active exchange's network id" },
                        notes: { type: "string", nullable: true },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Updated" },
        400: { description: "Invalid values" },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
function optionalNonNegative(value, name) {
    if (value === undefined)
        return undefined;
    if (value === null || value === "")
        return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0)
        throw (0, error_1.createError)({ statusCode: 400, message: `${name} must be a non-negative number or null` });
    return n;
}
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const currency = String((params === null || params === void 0 ? void 0 : params.currency) || "").trim().toUpperCase();
    if (!currency)
        throw (0, error_1.createError)({ statusCode: 400, message: "currency is required" });
    const patch = {};
    const capUsd = optionalNonNegative(body === null || body === void 0 ? void 0 : body.capUsd, "capUsd");
    if (capUsd !== undefined)
        patch.capUsd = capUsd;
    const thresholdUsd = optionalNonNegative(body === null || body === void 0 ? void 0 : body.thresholdUsd, "thresholdUsd");
    if (thresholdUsd !== undefined)
        patch.thresholdUsd = thresholdUsd;
    if ((body === null || body === void 0 ? void 0 : body.networkMap) !== undefined) {
        if (body.networkMap !== null && (typeof body.networkMap !== "object" || Array.isArray(body.networkMap))) {
            throw (0, error_1.createError)({ statusCode: 400, message: "networkMap must be an object of chain -> network id, or null" });
        }
        patch.networkMap = body.networkMap;
    }
    if ((body === null || body === void 0 ? void 0 : body.notes) !== undefined)
        patch.notes = body.notes === null ? null : String(body.notes);
    if (!Object.keys(patch).length)
        throw (0, error_1.createError)({ statusCode: 400, message: "Nothing to update" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating pool-backing settings for ${currency}`);
    const existing = await db_1.models.poolBackingCurrency.findOne({ where: { currency } });
    if (existing)
        await existing.update(patch);
    else
        await db_1.models.poolBackingCurrency.create({ currency, residualStreak: 0, ...patch });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Pool-backing settings updated for ${currency}`);
    return { message: `Settings updated for ${currency}` };
};
