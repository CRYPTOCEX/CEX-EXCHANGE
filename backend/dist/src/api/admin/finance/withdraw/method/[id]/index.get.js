"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves a specific withdrawal method by ID",
    operationId: "getWithdrawMethodById",
    tags: ["Admin", "Withdraw Methods"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the withdrawal method to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Withdraw method details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseWithdrawMethodSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Withdraw method not found"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.withdraw.method",
};
exports.default = async (data) => {
    const { params } = data;
    return await (0, query_1.getRecord)("withdrawMethod", params.id);
};
