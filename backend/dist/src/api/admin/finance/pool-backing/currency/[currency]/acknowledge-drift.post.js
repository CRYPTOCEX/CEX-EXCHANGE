"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Acknowledges a currency's persisted drift",
    description: "Records who accepted the unexplained gap the reconciliation persisted for this currency, and at what amount. A drift that later grows past the acknowledged amount counts as unacknowledged again. Acknowledging does not settle anything.",
    operationId: "acknowledgePoolBackingDrift",
    tags: ["Admin", "Finance", "Pool Backing"],
    requiresAuth: true,
    permission: "edit.pool.backing",
    logModule: "ADMIN_FIN",
    logTitle: "Acknowledge pool-backing drift",
    parameters: [
        { index: 0, name: "currency", in: "path", required: true, schema: { type: "string" } },
    ],
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: { note: { type: "string" } },
                },
            },
        },
    },
    responses: {
        200: { description: "Acknowledged" },
        400: { description: "Nothing to acknowledge" },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Currency"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const currency = String((params === null || params === void 0 ? void 0 : params.currency) || "").trim().toUpperCase();
    const anchor = await db_1.models.poolBackingCurrency.findOne({ where: { currency } });
    if (!anchor)
        throw (0, error_1.createError)({ statusCode: 404, message: "Currency not reconciled yet" });
    if (anchor.drift == null)
        throw (0, error_1.createError)({ statusCode: 400, message: "This currency has no persisted drift to acknowledge" });
    const note = typeof (body === null || body === void 0 ? void 0 : body.note) === "string" && body.note.trim() ? body.note.trim() : null;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Acknowledging drift for ${currency}`);
    await anchor.update({
        driftAcknowledgedAt: new Date(),
        driftAcknowledgedBy: user.id,
        driftAcknowledgedAmount: anchor.drift,
        ...(note ? { notes: note } : {}),
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Drift acknowledged for ${currency}`);
    return { message: `Drift of ${Number(anchor.drift).toFixed(8)} ${currency} acknowledged` };
};
