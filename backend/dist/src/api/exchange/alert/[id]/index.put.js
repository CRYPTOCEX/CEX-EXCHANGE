"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const rules_1 = require("../rules");
exports.metadata = {
    summary: "Update a Price Alert",
    operationId: "updatePriceAlert",
    tags: ["Exchange", "Alerts"],
    description: "Changes the level, direction, expiry, note or armed state of an existing " +
        "alert. Omitted fields are left alone; send null to clear the expiry.",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Alert id",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        targetPrice: { type: "number" },
                        condition: {
                            type: "string",
                            enum: ["CROSSES_ABOVE", "CROSSES_BELOW", "CROSSES"],
                        },
                        isRepeating: { type: "boolean" },
                        note: { type: "string", nullable: true },
                        expiresAt: {
                            type: "string",
                            nullable: true,
                            description: "ISO date or epoch milliseconds; null clears it",
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "DISABLED"],
                            description: "Pause or resume the alert. TRIGGERED and EXPIRED are set by the evaluator, not by a client.",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "The updated alert",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            alert: { type: "object", properties: utils_1.baseAlertSchema },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Price Alert"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "EXCHANGE",
    logTitle: "Update Price Alert",
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const id = params === null || params === void 0 ? void 0 : params.id;
    if (!id) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing alert id" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching alert");
    const alert = await db_1.models.exchangePriceAlert.findOne({
        where: { id, userId: user.id },
    });
    if (!alert) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Price alert not found" });
    }
    const now = Date.now();
    const updates = {};
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating changes");
    try {
        if ((body === null || body === void 0 ? void 0 : body.targetPrice) !== undefined) {
            updates.targetPrice = (0, rules_1.parseTargetPrice)(body.targetPrice);
        }
        if ((body === null || body === void 0 ? void 0 : body.condition) !== undefined) {
            updates.condition = (0, rules_1.parseCondition)(body.condition);
        }
        if ((body === null || body === void 0 ? void 0 : body.expiresAt) !== undefined) {
            updates.expiresAt = (0, rules_1.parseExpiresAt)(body.expiresAt, now);
        }
    }
    catch (error) {
        throw (0, utils_1.toHttpError)(error);
    }
    if ((body === null || body === void 0 ? void 0 : body.isRepeating) !== undefined) {
        updates.isRepeating = body.isRepeating === true;
    }
    if ((body === null || body === void 0 ? void 0 : body.note) !== undefined) {
        updates.note =
            typeof body.note === "string" ? body.note.slice(0, 255) : null;
    }
    if ((body === null || body === void 0 ? void 0 : body.status) !== undefined) {
        const next = String(body.status).toUpperCase();
        if (next !== "ACTIVE" && next !== "DISABLED") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "status may only be set to ACTIVE or DISABLED.",
            });
        }
        updates.status = next;
    }
    if (!Object.keys(updates).length) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Nothing to update.",
        });
    }
    const reArming = updates.status === "ACTIVE" && alert.status !== "ACTIVE";
    const levelMoved = updates.targetPrice !== undefined || updates.condition !== undefined;
    if (reArming || levelMoved) {
        updates.triggeredAt = null;
        updates.triggeredPrice = null;
        if (levelMoved && alert.status === "TRIGGERED")
            updates.status = "ACTIVE";
    }
    if (reArming)
        updates.lastPrice = null;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving alert");
    await alert.update(updates);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Updated alert on ${alert.symbol}`);
    return { message: "Price alert updated", alert: (0, utils_1.serializeAlert)(alert) };
};
