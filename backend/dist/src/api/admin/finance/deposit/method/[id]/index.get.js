"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves detailed information of a specific deposit method by ID",
    operationId: "getDepositMethodById",
    tags: ["Admin", "Deposit Methods"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the deposit method to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Deposit method details",
            content: {
                "application/json": {
                    schema: utils_1.methodSchema,
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Deposit Method"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.deposit.method",
};
exports.default = async (data) => {
    const { params } = data;
    return await (0, query_1.getRecord)("depositMethod", params.id);
};
