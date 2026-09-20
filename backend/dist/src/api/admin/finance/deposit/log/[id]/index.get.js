"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Get deposit transaction by ID",
    operationId: "getDepositTransactionById",
    tags: ["Admin", "Finance", "Deposits"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Deposit transaction ID",
        },
    ],
    responses: {
        200: {
            description: "Deposit transaction details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            userId: { type: "string" },
                            walletId: { type: "string" },
                            amount: { type: "number" },
                            fee: { type: "number" },
                            description: { type: "string" },
                            status: { type: "string" },
                            referenceId: { type: "string" },
                            createdAt: { type: "string" },
                            updatedAt: { type: "string" },
                            user: {
                                type: "object",
                                properties: {
                                    firstName: { type: "string" },
                                    lastName: { type: "string" },
                                    email: { type: "string" },
                                    avatar: { type: "string" },
                                },
                            },
                            wallet: {
                                type: "object",
                                properties: {
                                    currency: { type: "string" },
                                    type: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        404: {
            description: "Deposit transaction not found",
        },
    },
    requiresAuth: true,
    permission: "view.deposit",
    demoMask: ["user.email"],
};
exports.default = async (data) => {
    const { params, user } = data;
    const { id } = params;
    if (!user) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized",
        });
    }
    try {
        const transaction = await db_1.models.transaction.findOne({
            where: {
                id,
                type: "DEPOSIT",
            },
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
                {
                    model: db_1.models.wallet,
                    as: "wallet",
                    attributes: ["id", "currency", "type"],
                },
            ],
        });
        if (!transaction) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Deposit transaction not found",
            });
        }
        return {
            ...transaction.get({ plain: true }),
        };
    }
    catch (error) {
        console_1.logger.error("DEPOSIT", "Error fetching deposit transaction", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Internal server error",
        });
    }
};
