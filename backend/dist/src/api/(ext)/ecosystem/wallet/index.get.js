"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all wallets for the logged-in user",
    description: "Retrieves all wallets associated with the logged-in user, optionally including transactions and address.",
    operationId: "listWallets",
    tags: ["Wallet", "User"],
    logModule: "ECOSYSTEM",
    logTitle: "List user wallets",
    parameters: [
        {
            name: "transactions",
            in: "query",
            schema: { type: "boolean", default: false },
            description: "Whether to include transaction details",
        },
        {
            name: "address",
            in: "query",
            schema: { type: "boolean", default: false },
            description: "Whether to include wallet address",
        },
    ],
    responses: {
        200: {
            description: "Wallets retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.baseWalletSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Wallet"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { transactions, address } = query;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Building query parameters");
        const include = [];
        if (transactions === "true") {
            include.push({
                model: db_1.models.transaction,
                as: "transactions",
                attributes: [
                    "id",
                    "type",
                    "status",
                    "amount",
                    "fee",
                    "description",
                    "metadata",
                    "referenceId",
                    "createdAt",
                ],
            });
        }
        const attributes = ["id", "type", "currency", "balance"];
        if (address === "true") {
            attributes.push("address");
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user wallets");
        const wallets = await db_1.models.wallet.findAll({
            where: { userId: user.id, type: "ECO" },
            include,
            attributes,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${(wallets === null || wallets === void 0 ? void 0 : wallets.length) || 0} wallets`);
        return wallets;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to fetch wallets: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to fetch wallets: ${error.message}`,
        });
    }
};
