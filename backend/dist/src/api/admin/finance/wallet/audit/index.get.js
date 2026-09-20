"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const walletAuditLogSchema = {
    id: { type: "string", format: "uuid" },
    userId: { type: "string", format: "uuid" },
    walletId: { type: "string", format: "uuid" },
    operation: { type: "string" },
    amount: { type: "number" },
    previousBalance: { type: "number", nullable: true },
    newBalance: { type: "number", nullable: true },
    previousInOrder: { type: "number", nullable: true },
    newInOrder: { type: "number", nullable: true },
    transactionId: { type: "string", nullable: true },
    idempotencyKey: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
};
exports.metadata = {
    summary: "Lists wallet balance audit entries with pagination and filtering",
    operationId: "listWalletAuditLog",
    tags: ["Admin", "Wallets"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "List of wallet audit entries with pagination information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: { type: "object", properties: walletAuditLogSchema },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Wallet audit log"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.wallet",
};
exports.default = async (data) => {
    const { query } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.walletAuditLog,
        query,
        sortField: query.sortField || "createdAt",
        paranoid: false,
        timestamps: false,
        numericFields: [
            "amount",
            "previousBalance",
            "newBalance",
            "previousInOrder",
            "newInOrder",
        ],
        includeModels: [
            {
                model: db_1.models.wallet,
                as: "wallet",
                attributes: ["id", "currency", "type"],
                required: false,
            },
        ],
    });
};
