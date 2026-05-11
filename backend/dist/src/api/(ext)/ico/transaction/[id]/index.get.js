"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get ICO Transaction by ID",
    description: "Retrieves detailed ICO transaction data by its unique identifier, including associated offering and user details.",
    operationId: "getIcoTransactionById",
    tags: ["ICO", "Transactions"],
    logModule: "ICO",
    logTitle: "Get ICO Transaction",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Unique identifier of the ICO transaction",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "ICO transaction retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "string", description: "Transaction ID" },
                            amount: { type: "number", description: "Transaction amount" },
                            price: {
                                type: "number",
                                description: "Token price at time of transaction",
                            },
                            status: {
                                type: "string",
                                description: "Transaction status. One of PENDING, VERIFICATION, RELEASED, or REJECTED",
                            },
                            releaseUrl: {
                                type: "string",
                                description: "Transaction hash (or release URL, if used in its place)",
                            },
                            tokenAmount: {
                                type: "number",
                                description: "Calculated token amount (amount divided by token price)",
                            },
                            type: {
                                type: "string",
                                description: "Derived transaction type (for example, 'completed' if released, otherwise 'pending')",
                            },
                            date: {
                                type: "string",
                                format: "date-time",
                                description: "Transaction date",
                            },
                            notes: { type: "string", description: "Transaction notes" },
                            walletAddress: {
                                type: "string",
                                description: "Investor's wallet address",
                            },
                            offering: {
                                type: "object",
                                description: "Associated offering details",
                                properties: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                    symbol: { type: "string" },
                                    icon: { type: "string" },
                                    tokenDetail: { type: "object" },
                                },
                            },
                            user: {
                                type: "object",
                                description: "Investor user details",
                                properties: {
                                    id: { type: "string" },
                                    email: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        404: { description: "ICO transaction not found." },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    try {
        const { ctx } = data;
        const { user } = data;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching get ico transaction");
        const { id } = data.params || {};
        if (!id) {
            throw (0, error_1.createError)({ statusCode: 400, message: "No transaction ID provided" });
        }
        const transaction = await db_1.models.icoTransaction.findOne({
            where: { id: id, userId: user.id },
            include: [
                {
                    model: db_1.models.icoTokenOffering,
                    as: "offering",
                    include: [{ model: db_1.models.icoTokenDetail, as: "tokenDetail" }],
                },
                { model: db_1.models.user, as: "user" },
            ],
        });
        if (!transaction) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
        }
        return transaction.toJSON();
    }
    catch (error) {
        console_1.logger.error("ICO_TRANSACTION", "Error retrieving ICO transaction by ID", error);
        throw error;
    }
};
