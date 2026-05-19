"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../../../../finance/transaction/utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves detailed information of a specific wallet transaction by ID",
    operationId: "getWalletTransactionById",
    tags: ["Admin", "Wallets", "Transactions"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the wallet transaction to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Wallet transaction details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.transactionSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Wallet Transaction"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.transaction",
    demoMask: ["user.email"],
};
exports.default = async (data) => {
    const { params } = data;
    const exclude = [
        "type",
        "status",
        "amount",
        "fee",
        "description",
        "metadata",
        "referenceId",
    ];
    return await (0, query_1.getRecord)("transaction", params.id, [
        {
            model: db_1.models.wallet,
            as: "wallet",
            attributes: ["currency", "type"],
        },
        {
            model: db_1.models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
    ]);
};
