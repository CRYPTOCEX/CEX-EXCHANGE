"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all deposit methods",
    operationId: "listDepositMethods",
    tags: ["Admin", "Deposit Methods"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Paginated list of deposit methods retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.baseDepositMethodSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Deposit Methods"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.deposit.method",
};
exports.default = async (data) => {
    const { query } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.depositMethod,
        query,
        sortField: query.sortField || "createdAt",
        numericFields: ["fixedFee", "percentageFee", "minAmount", "maxAmount"],
    });
};
