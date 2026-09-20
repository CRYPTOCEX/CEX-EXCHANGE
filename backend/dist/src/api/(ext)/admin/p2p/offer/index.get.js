"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "List all P2P offers",
    operationId: "listAdminP2POffers",
    tags: ["Admin", "P2P", "Offer"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Retrieves a paginated list of all P2P offers with detailed information including user details, payment methods, and offer status. Supports filtering, sorting, and pagination.",
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
        404: (0, query_1.notFoundMetadataResponse)("p2p Offers"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_P2P",
    logTitle: "Get P2P Offers",
    permission: "view.p2p.offer",
    demoMask: ["items.user.email"],
};
exports.default = async (data) => {
    const { query, user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching data");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.p2pOffer,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.p2pPaymentMethod,
                as: "paymentMethods",
                attributes: ["id", "name", "icon"],
                through: { attributes: [] },
            },
        ],
    });
    if (result.items && Array.isArray(result.items)) {
        result.items = result.items.map((offer) => {
            const plain = offer.get ? offer.get({ plain: true }) : offer;
            if (!plain.priceCurrency && plain.priceConfig) {
                plain.priceCurrency = plain.priceConfig.currency || "USD";
            }
            return plain;
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("P2P offers retrieved successfully");
    return result;
};
