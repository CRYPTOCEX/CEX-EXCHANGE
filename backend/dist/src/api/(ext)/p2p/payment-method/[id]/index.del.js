"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Delete Payment Method",
    description: "Deletes an existing custom payment method by its ID. Prevents deletion if the payment method is being used by active offers or ongoing trades.",
    operationId: "deletePaymentMethod",
    tags: ["P2P", "Payment Method"],
    logModule: "P2P",
    logTitle: "Delete payment method",
    requiresAuth: true,
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
    responses: {
        200: { description: "Payment method deleted successfully." },
        400: { description: "Cannot delete payment method that is being used by active offers or ongoing trades." },
        401: { description: "Unauthorized." },
        404: { description: "Payment method not found or not owned by user." },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { params, user, ctx } = data;
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
        if (!paymentMethod.userId || paymentMethod.userId !== user.id) {
            throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized - you can only delete your own payment methods" });
        }
        const activeOffers = await db_1.models.p2pOffer.findAll({
            include: [
                {
                    model: db_1.models.p2pPaymentMethod,
                    as: "paymentMethods",
                    where: { id: paymentMethod.id },
                    attributes: ["id"],
                    through: { attributes: [] },
                },
            ],
            where: {
                status: { [sequelize_1.Op.in]: ["ACTIVE", "PENDING_APPROVAL", "PAUSED"] },
            },
            attributes: ["id", "status"],
        });
        if (activeOffers.length > 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot delete payment method. It is currently being used by ${activeOffers.length} active offer(s). Please remove this payment method from these offers first.`,
            });
        }
        const ongoingTrades = await db_1.models.p2pTrade.findAll({
            where: {
                paymentMethod: id,
                status: { [sequelize_1.Op.in]: ["PENDING", "PAYMENT_SENT", "DISPUTED"] },
            },
            attributes: ["id", "status"],
        });
        if (ongoingTrades.length > 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot delete payment method. It is currently being used by ${ongoingTrades.length} ongoing trade(s). Please wait for these trades to complete or be cancelled.`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting payment method");
        await paymentMethod.destroy();
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Deleted payment method: ${paymentMethod.name}`);
        return { message: "Payment method deleted successfully." };
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
