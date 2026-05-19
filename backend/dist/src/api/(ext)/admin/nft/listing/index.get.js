"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
exports.metadata = {
    summary: "List NFT listings for admin management",
    operationId: "listAdminNftListings",
    tags: ["Admin", "NFT", "Listings"],
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Listings",
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "NFT listings retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: { $ref: "#/components/schemas/NftListing" }
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
    permission: "access.nft.listing",
    demoMask: ["items.seller.email"],
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching NFT listings");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("NFT listings retrieved successfully");
    return (0, query_1.getFiltered)({
        model: db_1.models.nftListing,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.nftToken,
                as: "token",
                attributes: ["id", "name", "tokenId", "image"],
                includeModels: [
                    {
                        model: db_1.models.nftCollection,
                        as: "collection",
                        attributes: ["id", "name", "symbol"],
                    }
                ]
            },
            {
                model: db_1.models.user,
                as: "seller",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            }
        ],
        numericFields: ["price", "startingBid", "reservePrice", "currentBid", "bidCount"],
    });
};
