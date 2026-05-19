"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Create Global P2P Payment Method",
    description: "Creates a new global payment method that is available to all users. Admin only.",
    operationId: "createGlobalP2PPaymentMethod",
    tags: ["Admin", "P2P", "Payment Method"],
    requiresAuth: true,
    permission: "create.p2p.payment_method",
    logModule: "ADMIN_P2P",
    logTitle: "Create global payment method",
    requestBody: {
        description: "Global payment method data",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "Payment method name"
                        },
                        icon: {
                            type: "string",
                            description: "Icon URL or icon class"
                        },
                        description: {
                            type: "string",
                            description: "Payment method description"
                        },
                        instructions: {
                            type: "string",
                            description: "Instructions for using this payment method"
                        },
                        metadata: {
                            type: ["object", "null"],
                            description: "Flexible key-value pairs for payment details"
                        },
                        processingTime: {
                            type: "string",
                            description: "Expected processing time"
                        },
                        fees: {
                            type: "string",
                            description: "Fee information"
                        },
                        available: {
                            type: "boolean",
                            description: "Whether the payment method is currently available"
                        },
                        popularityRank: {
                            type: "number",
                            description: "Sorting rank (lower numbers appear first)"
                        }
                    },
                    required: ["name", "icon"],
                },
            },
        },
    },
    responses: {
        200: { description: "Global payment method created successfully." },
        401: { description: "Unauthorized." },
        403: { description: "Forbidden - Admin access required." },
        400: { description: "Bad request - Invalid data." },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    var _a, _b, _c, _d;
    const { body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating required fields");
        if (!body.name || !body.icon) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required fields");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Name and icon are required fields",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for duplicate payment method");
        const duplicate = await db_1.models.p2pPaymentMethod.findOne({
            where: {
                name: body.name,
                isGlobal: true,
                deletedAt: null,
            },
        });
        if (duplicate) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Duplicate payment method name");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "A global payment method with this name already exists",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sanitizing metadata");
        let sanitizedMetadata = null;
        if (body.metadata && typeof body.metadata === "object") {
            sanitizedMetadata = {};
            for (const [key, value] of Object.entries(body.metadata)) {
                if (typeof key === "string" && key.trim()) {
                    sanitizedMetadata[key.trim()] = String(value);
                }
            }
            if (Object.keys(sanitizedMetadata).length === 0) {
                sanitizedMetadata = null;
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating global payment method");
        const paymentMethod = await db_1.models.p2pPaymentMethod.create({
            userId: undefined,
            name: body.name,
            icon: body.icon,
            description: (_a = body.description) !== null && _a !== void 0 ? _a : undefined,
            instructions: (_b = body.instructions) !== null && _b !== void 0 ? _b : undefined,
            metadata: sanitizedMetadata !== null && sanitizedMetadata !== void 0 ? sanitizedMetadata : undefined,
            processingTime: (_c = body.processingTime) !== null && _c !== void 0 ? _c : undefined,
            fees: (_d = body.fees) !== null && _d !== void 0 ? _d : undefined,
            available: body.available !== false,
            isGlobal: true,
            popularityRank: body.popularityRank || 0,
        });
        console_1.logger.info("P2P", `Created global payment method: ${paymentMethod.id} - ${paymentMethod.name} by admin ${user.id}`);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Logging admin activity");
        await db_1.models.p2pActivityLog.create({
            userId: user.id,
            type: "ADMIN_PAYMENT_METHOD",
            action: "CREATED",
            relatedEntity: "PAYMENT_METHOD",
            relatedEntityId: paymentMethod.id,
            details: JSON.stringify({
                name: body.name,
                icon: body.icon,
                isGlobal: true,
                adminAction: true,
                updatedBy: `${user.firstName} ${user.lastName}`,
                action: "created",
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Global payment method created successfully");
        return {
            message: "Global payment method created successfully.",
            paymentMethod: {
                id: paymentMethod.id,
                userId: paymentMethod.userId,
                name: paymentMethod.name,
                icon: paymentMethod.icon,
                description: paymentMethod.description,
                instructions: paymentMethod.instructions,
                metadata: paymentMethod.metadata,
                processingTime: paymentMethod.processingTime,
                fees: paymentMethod.fees,
                available: paymentMethod.available,
                isGlobal: paymentMethod.isGlobal,
                popularityRank: paymentMethod.popularityRank,
                createdAt: paymentMethod.createdAt,
            },
        };
    }
    catch (err) {
        if (err.statusCode) {
            throw err;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to create global payment method");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to create global payment method: " + err.message,
        });
    }
};
