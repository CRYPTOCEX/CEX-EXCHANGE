"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
exports.metadata = {
    summary: "Lists all p2p offers with pagination and optional filtering",
    operationId: "listP2POffers",
    tags: ["Admin", "P2P", "Offers"],
    logModule: "P2P",
    logTitle: "List offers",
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Paginated list of p2p offers with detailed information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
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
};
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching active P2P offers");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.p2pOffer,
        query,
        sortField: query.sortField || "createdAt",
        where: { status: "ACTIVE" },
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
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.pagination) === null || _a === void 0 ? void 0 : _a.totalItems) || 0} offers`);
    return result;
};
