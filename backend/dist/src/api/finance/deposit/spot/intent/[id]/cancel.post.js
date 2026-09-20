"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const intents_1 = require("@b/utils/spot-deposit/intents");
exports.metadata = {
    summary: "Cancels an open spot deposit intent",
    description: "Cancels one of the authenticated user's OPEN spot deposit intents. An intent whose deposit has already been seen cannot be cancelled.",
    operationId: "cancelSpotDepositIntent",
    tags: ["Finance", "Deposit"],
    requiresAuth: true,
    logModule: "SPOT_DEPOSIT",
    logTitle: "Cancel spot deposit intent",
    parameters: [
        { index: 0, name: "id", in: "path", required: true, schema: { type: "string" }, description: "Intent id" },
    ],
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        reason: { type: "string", description: "Optional reason, kept on the row" },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Intent cancelled",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            intent: { type: "object" },
                        },
                    },
                },
            },
        },
        400: { description: "The intent is not OPEN" },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Intent"),
        409: { description: "The deposit was seen while cancelling" },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const id = String((params === null || params === void 0 ? void 0 : params.id) || "").trim();
    if (!id)
        throw (0, error_1.createError)({ statusCode: 400, message: "Intent id is required" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Locating the intent");
    const intent = await db_1.models.spotDepositIntent.findOne({ where: { id, userId: user.id } });
    if (!intent) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Intent not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Intent not found" });
    }
    if (intent.status !== "OPEN") {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Intent ${id} is ${intent.status}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: intent.status === "MATCHED" || intent.status === "SWEEPING"
                ? "Your deposit has already been seen and is being processed; it can no longer be cancelled."
                : `This deposit request is ${String(intent.status).toLowerCase()} and cannot be cancelled.`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Cancelling");
    const reason = (body === null || body === void 0 ? void 0 : body.reason) ? String(body.reason).slice(0, 500) : undefined;
    const cancelled = await (0, intents_1.markCancelled)(id, {
        metadata: reason ? { cancelReason: reason } : {},
        broadcast: { message: "Deposit request cancelled" },
    });
    if (!cancelled || cancelled.status !== "CANCELLED") {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Intent ${id} left OPEN before it could be cancelled`);
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "Your deposit was seen while you were cancelling and can no longer be cancelled.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Intent ${id} cancelled`);
    return { message: "Deposit request cancelled", intent: (0, intents_1.serialiseIntent)(cancelled) };
};
