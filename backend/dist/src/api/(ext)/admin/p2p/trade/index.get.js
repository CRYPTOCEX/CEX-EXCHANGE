"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Lists all p2p trades with pagination and optional filtering",
    operationId: "listP2PTrades",
    tags: ["Admin", "P2P", "Trades"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Paginated list of p2p trades with detailed information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("p2p Trades"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_P2P",
    logTitle: "Get P2P Trades",
    permission: "view.p2p.trade",
    demoMask: ["items.buyer.email", "items.seller.email"],
};
exports.default = async (data) => {
    const { query, user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching data");
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Operation completed successfully");
    return (0, query_1.getFiltered)({
        model: db_1.models.p2pTrade,
        query,
        sortField: query.sortField || "createdAt",
        where: {},
        includeModels: [
            {
                model: db_1.models.user,
                as: "buyer",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.user,
                as: "seller",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.p2pDispute,
                as: "dispute",
            },
        ],
    });
};
