"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Delete P2P Payment Method (Admin)",
    description: "Soft deletes a payment method. Admin can delete any payment method.",
    operationId: "deleteP2PPaymentMethod",
    tags: ["Admin", "P2P", "Payment Method"],
    requiresAuth: true,
    permission: "delete.p2p.payment_method",
    logModule: "ADMIN_P2P",
    logTitle: "Delete payment method",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "Payment method ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: { description: "Payment method deleted successfully." },
        401: { description: "Unauthorized." },
        403: { description: "Forbidden - Admin access required." },
        404: { description: "Payment method not found." },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    var _a;
    const { params, user, ctx } = data;
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
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for active offers using payment method");
        const activeOffers = await db_1.sequelize.query(`SELECT COUNT(*) as count
       FROM p2p_offer_payment_method opm
       JOIN p2p_offers o ON opm.offerId = o.id
       WHERE opm.paymentMethodId = :methodId
       AND o.status = 'ACTIVE'
       AND o.deletedAt IS NULL`, {
            replacements: { methodId: params.id },
            type: sequelize_1.QueryTypes.SELECT,
        });
        const offerCount = parseInt((((_a = activeOffers[0]) === null || _a === void 0 ? void 0 : _a.count) || '0'), 10);
        if (offerCount > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Payment method is in use by ${offerCount} active offers`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot delete payment method. It is being used in ${offerCount} active offer(s).`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting payment method");
        await paymentMethod.destroy();
        console.log(`[P2P Admin] Deleted payment method: ${paymentMethod.id} by admin ${user.id}`);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Logging admin activity");
        await db_1.models.p2pActivityLog.create({
            userId: user.id,
            type: "ADMIN_PAYMENT_METHOD",
            action: "DELETED",
            relatedEntity: "PAYMENT_METHOD",
            relatedEntityId: paymentMethod.id,
            details: JSON.stringify({
                name: paymentMethod.name,
                isGlobal: paymentMethod.isGlobal,
                adminAction: true,
                updatedBy: `${user.firstName} ${user.lastName}`,
                action: "deleted",
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Payment method deleted successfully");
        return {
            message: "Payment method deleted successfully.",
        };
    }
    catch (err) {
        if (err.statusCode) {
            throw err;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to delete payment method");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to delete payment method: " + err.message,
        });
    }
};
