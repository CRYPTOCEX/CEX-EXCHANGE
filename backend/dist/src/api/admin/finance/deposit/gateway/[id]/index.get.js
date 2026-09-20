"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("./../utils");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Retrieves detailed information of a specific deposit gateway by ID",
    operationId: "getDepositGatewayById",
    tags: ["Admin", "Deposit Gateways"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the deposit gateway to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Deposit gateway details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseGatewaySchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Deposit Gateway"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.deposit.gateway",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params } = data;
    return await (0, query_1.getRecord)("depositGateway", params.id);
};
