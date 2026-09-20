"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get P2P Payment Method by ID (Admin)",
    description: "Retrieves a single payment method by its ID.",
    operationId: "getP2PPaymentMethodById",
    tags: ["Admin", "P2P", "Payment Method"],
    requiresAuth: true,
    logModule: "ADMIN_P2P",
    logTitle: "Get P2P Payment Method",
    permission: "view.p2p.payment_method",
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
        200: { description: "Payment method retrieved successfully." },
        401: { description: "Unauthorized." },
        403: { description: "Forbidden - Admin access required." },
        404: { description: "Payment method not found." },
        500: { description: "Internal Server Error." },
    },
    demoMask: ["user.email"],
};
exports.default = async (data) => {
    const { params, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching data");
        const paymentMethod = await db_1.models.p2pPaymentMethod.findOne({
            where: {
                id: params.id,
                deletedAt: null,
            },
            include: [
                {
                    association: "user",
                    attributes: ["id", "firstName", "lastName", "email"],
                },
            ],
        });
        if (!paymentMethod) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Payment method not found",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Operation completed successfully");
        return {
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
            updatedAt: paymentMethod.updatedAt,
            user: paymentMethod.user,
        };
    }
    catch (err) {
        if (err.statusCode) {
            throw err;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to get payment method: " + err.message,
        });
    }
};
