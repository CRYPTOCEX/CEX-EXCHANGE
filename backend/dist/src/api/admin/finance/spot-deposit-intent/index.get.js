"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
exports.metadata = {
    summary: "Lists spot deposit intents",
    description: "Every declared spot deposit, in any mode, with the status that says where its money is: OPEN/MATCHED/SWEEPING in flight, CREDITED done, REVIEW and FAILED waiting for an operator.",
    operationId: "listSpotDepositIntents",
    tags: ["Admin", "Finance", "Spot Deposit Intents"],
    parameters: constants_1.crudParameters,
    requiresAuth: true,
    permission: "view.spot.deposit.intent",
    demoMask: ["items.user.email"],
    responses: {
        200: {
            description: "Paginated list of spot deposit intents",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: { type: "array", items: { type: "object" } },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Spot deposit intents"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, query } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    return (0, query_1.getFiltered)({
        model: db_1.models.spotDepositIntent,
        query,
        sortField: query.sortField || "createdAt",
        paranoid: false,
        numericFields: ["declaredAmount", "expectedAmount"],
        includeModels: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.wallet,
                as: "wallet",
                attributes: ["id", "currency", "type"],
            },
        ],
    });
};
