"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Update Payment Method",
    description: "Updates an existing custom payment method by its ID.",
    operationId: "updatePaymentMethod",
    tags: ["P2P", "Payment Method"],
    requiresAuth: true,
    logModule: "P2P_PAYMENT",
    logTitle: "Update payment method",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Payment Method ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "Fields to update for the payment method",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        instructions: { type: "string" },
                        metadata: {
                            type: ["object", "null"],
                            description: "Flexible key-value pairs for payment details",
                            additionalProperties: { type: "string" },
                        },
                        processingTime: { type: "string" },
                        available: { type: "boolean" },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Payment method updated successfully." },
        401: { description: "Unauthorized." },
        404: { description: "Payment method not found or not owned by user." },
        409: { description: "Cannot edit payment method with active trades." },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b, _c, _d;
    const { params, body, user, ctx } = data;
    const id = params === null || params === void 0 ? void 0 : params.id;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding and validating payment method ownership");
    try {
        const paymentMethod = await db_1.models.p2pPaymentMethod.findByPk(id);
        if (!paymentMethod) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Payment method not found",
            });
        }
        if (paymentMethod.userId !== user.id) {
            throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized - you can only edit your own payment methods" });
        }
        const activeTrade = await db_1.models.p2pTrade.findOne({
            where: {
                paymentMethod: id,
                status: { [sequelize_1.Op.in]: ["PENDING", "PAYMENT_SENT", "DISPUTED"] }
            }
        });
        if (activeTrade) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Cannot edit payment method while it is being used in an active trade. Please wait for all trades using this method to complete or be cancelled."
            });
        }
        let sanitizedMetadata = paymentMethod.metadata;
        if (body.metadata !== undefined) {
            if (body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)) {
                sanitizedMetadata = {};
                const MAX_FIELDS = 20;
                let fieldCount = 0;
                for (const [key, value] of Object.entries(body.metadata)) {
                    if (fieldCount >= MAX_FIELDS)
                        break;
                    if (typeof key === "string" && typeof value === "string") {
                        const sanitizedKey = key.trim().substring(0, 100);
                        const sanitizedValue = value.trim().substring(0, 500);
                        if (sanitizedKey && sanitizedValue) {
                            sanitizedMetadata[sanitizedKey] = sanitizedValue;
                            fieldCount++;
                        }
                    }
                }
                if (Object.keys(sanitizedMetadata).length === 0) {
                    sanitizedMetadata = undefined;
                }
            }
            else {
                sanitizedMetadata = undefined;
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating payment method");
        await paymentMethod.update({
            name: (_a = body.name) !== null && _a !== void 0 ? _a : paymentMethod.name,
            description: (_b = body.description) !== null && _b !== void 0 ? _b : paymentMethod.description,
            instructions: (_c = body.instructions) !== null && _c !== void 0 ? _c : paymentMethod.instructions,
            metadata: sanitizedMetadata,
            processingTime: (_d = body.processingTime) !== null && _d !== void 0 ? _d : paymentMethod.processingTime,
            available: typeof body.available === "boolean"
                ? body.available
                : paymentMethod.available,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Updated payment method: ${paymentMethod.name}`);
        return {
            message: "Payment method updated successfully.",
            paymentMethod: paymentMethod.toJSON(),
        };
    }
    catch (err) {
        if (err.statusCode)
            throw err;
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
