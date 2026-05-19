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
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Create Payment Method",
    description: "Creates a new custom payment method for the authenticated user.",
    operationId: "createPaymentMethod",
    tags: ["P2P", "Payment Method"],
    requiresAuth: true,
    middleware: ["p2pPaymentMethodCreateRateLimit"],
    logModule: "P2P_PAYMENT",
    logTitle: "Create payment method",
    requestBody: {
        description: "Payment method data",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        icon: { type: "string" },
                        description: { type: "string" },
                        instructions: { type: "string" },
                        metadata: {
                            type: ["object", "null"],
                            description: "Flexible key-value pairs for payment details (e.g., { 'PayPal Email': 'user@example.com' })",
                            additionalProperties: { type: "string" },
                        },
                        processingTime: { type: "string" },
                        available: { type: "boolean" },
                    },
                    required: ["name"],
                },
            },
        },
    },
    responses: {
        200: { description: "Payment method created successfully." },
        401: { description: "Unauthorized." },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    const { body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating payment method data");
    const { validatePaymentMethod } = await Promise.resolve().then(() => __importStar(require("../utils/validation")));
    try {
        const validatedData = validatePaymentMethod(body);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking user payment method limits");
        const existingCountResult = await db_1.models.p2pPaymentMethod.count({ where: { userId: user.id } });
        const MAX_PAYMENT_METHODS = 20;
        if (existingCountResult >= MAX_PAYMENT_METHODS) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `You can only have up to ${MAX_PAYMENT_METHODS} payment methods`,
            });
        }
        const duplicate = await db_1.models.p2pPaymentMethod.findOne({ where: { userId: user.id, name: validatedData.name } });
        if (duplicate) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "You already have a payment method with this name. Please use a different name or edit your existing method.",
            });
        }
        let sanitizedMetadata = null;
        if (body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)) {
            const tempMetadata = {};
            const MAX_FIELDS = 20;
            let fieldCount = 0;
            for (const [key, value] of Object.entries(body.metadata)) {
                if (fieldCount >= MAX_FIELDS)
                    break;
                if (typeof key === "string" && typeof value === "string") {
                    const sanitizedKey = key.trim().substring(0, 100);
                    const sanitizedValue = value.trim().substring(0, 500);
                    if (sanitizedKey && sanitizedValue) {
                        tempMetadata[sanitizedKey] = sanitizedValue;
                        fieldCount++;
                    }
                }
            }
            if (Object.keys(tempMetadata).length > 0) {
                sanitizedMetadata = tempMetadata;
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating payment method");
        const paymentMethod = await db_1.models.p2pPaymentMethod.create({
            userId: user.id,
            ...validatedData,
            metadata: sanitizedMetadata || undefined,
            available: typeof body.available === "boolean" ? body.available : true,
            isGlobal: false,
            popularityRank: 999,
        });
        console_1.logger.info("P2P_PAYMENT_METHOD", `Created custom payment method: ${paymentMethod.id} - ${paymentMethod.name} for user ${user.id}`);
        await db_1.models.p2pActivityLog.create({
            userId: user.id,
            type: "PAYMENT_METHOD",
            action: "CREATED",
            relatedEntity: "PAYMENT_METHOD",
            relatedEntityId: paymentMethod.id,
            details: JSON.stringify({
                name: validatedData.name,
                icon: validatedData.icon,
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Created payment method: ${validatedData.name}`);
        return {
            message: "Payment method created successfully.",
            paymentMethod: {
                id: paymentMethod.id,
                userId: paymentMethod.userId,
                name: paymentMethod.name,
                icon: paymentMethod.icon,
                description: paymentMethod.description,
                instructions: paymentMethod.instructions,
                metadata: paymentMethod.metadata,
                processingTime: paymentMethod.processingTime,
                available: paymentMethod.available,
                popularityRank: paymentMethod.popularityRank,
                createdAt: paymentMethod.createdAt,
            },
        };
    }
    catch (err) {
        if (err.statusCode) {
            throw err;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to create payment method: " + err.message,
        });
    }
};
