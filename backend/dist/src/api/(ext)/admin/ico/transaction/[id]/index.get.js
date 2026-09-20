"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Transaction Details",
    description: "Retrieves transaction details by ID along with related offering and investor data, plus all other transactions for the same offering and investor.",
    operationId: "adminGetTransactionDetails",
    tags: ["ICO", "Admin", "Transaction"],
    requiresAuth: true,
    logModule: "ADMIN_ICO",
    logTitle: "Get ICO Transaction",
    responses: {
        200: {
            description: "Transaction details retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            amount: { type: "number" },
                            price: { type: "number" },
                            status: {
                                type: "string",
                                enum: ["PENDING", "VERIFICATION", "RELEASED", "REJECTED"],
                            },
                            releaseUrl: { type: "string" },
                            walletAddress: { type: "string" },
                            notes: { type: "string" },
                            createdAt: { type: "string", format: "date-time" },
                            updatedAt: { type: "string", format: "date-time" },
                            offering: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                    symbol: { type: "string" },
                                    userId: { type: "string" },
                                    purchaseWalletType: { type: "string" },
                                    purchaseWalletCurrency: { type: "string" },
                                },
                            },
                            user: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    firstName: { type: "string" },
                                    lastName: { type: "string" },
                                    email: { type: "string" },
                                    avatar: { type: "string" },
                                },
                            },
                            relatedTransactions: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        amount: { type: "number" },
                                        price: { type: "number" },
                                        status: {
                                            type: "string",
                                            enum: ["PENDING", "VERIFICATION", "RELEASED", "REJECTED"],
                                        },
                                        releaseUrl: { type: "string" },
                                        createdAt: { type: "string", format: "date-time" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized – Admin privileges required." },
        404: { description: "Transaction not found." },
        500: { description: "Internal Server Error" },
    },
    permission: "view.ico.transaction",
    demoMask: ["user.email"],
};
exports.default = async (data) => {
    const { params, user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const transaction = await db_1.models.icoTransaction.findOne({
        where: { id: params.id },
        include: [
            {
                model: db_1.models.icoTokenOffering,
                as: "offering",
                attributes: [
                    "id",
                    "userId",
                    "name",
                    "symbol",
                    "purchaseWalletType",
                    "purchaseWalletCurrency",
                ],
            },
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
    });
    if (!transaction) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found." });
    }
    const relatedTransactions = await db_1.models.icoTransaction.findAll({
        where: {
            offeringId: transaction.offeringId,
            userId: transaction.userId,
            id: { [sequelize_1.Op.ne]: transaction.id },
        },
        attributes: ["id", "amount", "price", "status", "releaseUrl", "createdAt"],
        order: [["createdAt", "DESC"]],
    });
    const txJSON = transaction.toJSON();
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get ICO Transaction retrieved successfully");
    return {
        ...txJSON,
        relatedTransactions: relatedTransactions.map((tx) => tx.toJSON()),
    };
};
