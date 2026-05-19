"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Update P2P Payment Method (Admin)",
    description: "Updates a payment method. Admin can update any payment method and toggle global status.",
    operationId: "updateP2PPaymentMethod",
    tags: ["Admin", "P2P", "Payment Method"],
    requiresAuth: true,
    permission: "edit.p2p.payment_method",
    logModule: "ADMIN_P2P",
    logTitle: "Update payment method",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "Payment method ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "Payment method update data",
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
                        metadata: { type: ["object", "null"], description: "Flexible key-value pairs for payment details" },
                        processingTime: { type: "string" },
                        fees: { type: "string" },
                        available: { type: "boolean" },
                        isGlobal: { type: "boolean" },
                        popularityRank: { type: "number" },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Payment method updated successfully." },
        401: { description: "Unauthorized." },
        403: { description: "Forbidden - Admin access required." },
        404: { description: "Payment method not found." },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    const { params, body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching payment method");
        const paymentMethod = await db_1.models.p2pPaymentMethod.findByPk(params.id);
        if (!paymentMethod) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Payment method not found");
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Payment method not found",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for duplicate names");
        if (body.name && body.name !== paymentMethod.name) {
            const duplicate = await db_1.models.p2pPaymentMethod.findOne({
                where: {
                    name: body.name,
                    isGlobal: body.isGlobal !== undefined ? body.isGlobal : paymentMethod.isGlobal,
                    id: { [sequelize_1.Op.ne]: params.id },
                    deletedAt: null,
                },
            });
            if (duplicate) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Duplicate payment method name");
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "A payment method with this name already exists",
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Preparing update data");
        const updateData = {};
        if (body.name !== undefined)
            updateData.name = body.name;
        if (body.icon !== undefined)
            updateData.icon = body.icon;
        if (body.description !== undefined)
            updateData.description = body.description;
        if (body.instructions !== undefined)
            updateData.instructions = body.instructions;
        if (body.processingTime !== undefined)
            updateData.processingTime = body.processingTime;
        if (body.fees !== undefined)
            updateData.fees = body.fees;
        if (body.available !== undefined)
            updateData.available = body.available;
        if (body.isGlobal !== undefined)
            updateData.isGlobal = body.isGlobal;
        if (body.popularityRank !== undefined)
            updateData.popularityRank = body.popularityRank;
        if (body.metadata !== undefined) {
            if (body.metadata === null) {
                updateData.metadata = null;
            }
            else if (typeof body.metadata === "object") {
                const sanitizedMetadata = {};
                for (const [key, value] of Object.entries(body.metadata)) {
                    if (typeof key === "string" && key.trim()) {
                        sanitizedMetadata[key.trim()] = String(value);
                    }
                }
                updateData.metadata = Object.keys(sanitizedMetadata).length > 0 ? sanitizedMetadata : null;
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating payment method");
        await paymentMethod.update(updateData);
        console_1.logger.info("P2P", `Updated payment method: ${paymentMethod.id} by admin ${user.id}`);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Logging admin activity");
        await db_1.models.p2pActivityLog.create({
            userId: user.id,
            type: "ADMIN_PAYMENT_METHOD",
            action: "UPDATED",
            relatedEntity: "PAYMENT_METHOD",
            relatedEntityId: paymentMethod.id,
            details: JSON.stringify({
                changes: updateData,
                adminAction: true,
                updatedBy: `${user.firstName} ${user.lastName}`,
                action: "updated",
                name: paymentMethod.name,
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Payment method updated successfully");
        return {
            message: "Payment method updated successfully.",
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
                updatedAt: paymentMethod.updatedAt,
            },
        };
    }
    catch (err) {
        if (err.statusCode) {
            throw err;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to update payment method");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to update payment method: " + err.message,
        });
    }
};
