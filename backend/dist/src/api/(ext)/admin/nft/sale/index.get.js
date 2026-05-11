"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
exports.metadata = {
    summary: "List NFT sales for admin management",
    operationId: "listAdminNftSales",
    tags: ["Admin", "NFT", "Sales"],
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Sales",
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "NFT sales retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: { $ref: "#/components/schemas/NftSale" }
                            },
                            pagination: constants_1.paginationSchema
                        }
                    }
                }
            }
        },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true,
    permission: "access.nft.sale",
    demoMask: ["items.seller.email", "items.buyer.email"],
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching NFT sales");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("NFT sales retrieved successfully");
    return (0, query_1.getFiltered)({
        model: db_1.models.nftSale,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.nftToken,
                as: "token",
                attributes: ["id", "name", "tokenId", "image"],
            },
            {
                model: db_1.models.user,
                as: "seller",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.user,
                as: "buyer",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            }
        ],
        numericFields: ["price", "marketplaceFee", "royaltyFee", "totalFee", "netAmount", "blockNumber"],
    });
};
