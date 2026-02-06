"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves detailed information of a specific binary order by ID",
    operationId: "getBinaryOrderById",
    tags: ["Admin", "Binary Order"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the binary order to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Binary order details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.orderSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Binary Order"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.binary.order",
    demoMask: ["user.email"],
};
exports.default = async (data) => {
    const { params } = data;
    const attributes = [
        "symbol",
        "price",
        "amount",
        "profit",
        "side",
        "type",
        "status",
        "isDemo",
        "closePrice",
    ];
    return await (0, query_1.getRecord)("binaryOrder", params.id, [
        {
            model: db_1.models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
    ]);
};
