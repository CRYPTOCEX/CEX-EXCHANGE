"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const index_post_1 = __importDefault(require("@b/api/(ext)/nft/bid/index.post"));
const storefront_1 = require("@b/utils/storefront");
exports.metadata = {
    summary: "Place bid on NFT auction",
    operationId: "placeBidOnAuction",
    tags: ["NFT", "Auction", "Bid"],
    logModule: "NFT",
    logTitle: "Place auction bid",
    description: "Deprecated alias for POST /api/nft/bid. Kept for API compatibility; it delegates to the canonical handler so the per-listing minimum increment, start-time and currency checks all apply.",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Auction/Listing ID",
            schema: { type: "string" }
        }
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: {
                            type: "number",
                            description: "Bid amount",
                            minimum: 0
                        },
                        transactionHash: {
                            type: "string",
                            description: "Transaction hash for bid verification"
                        }
                    },
                    required: ["amount", "transactionHash"]
                }
            }
        }
    },
    responses: {
        200: {
            description: "Bid placed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    bid: { $ref: "#/components/schemas/NftBid" },
                                    auction: { $ref: "#/components/schemas/NftListing" }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Cannot bid on own auction" },
        404: { description: "Auction not found" },
        409: { description: "Auction ended or bid too low" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true
};
exports.default = async (data) => {
    (0, storefront_1.assertPurchaseAllowedOnNativeApp)(data, "place bids");
    const { params, body } = data;
    const listingId = params === null || params === void 0 ? void 0 : params.id;
    if (!listingId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Auction ID is required" });
    }
    const listing = await db_1.models.nftListing.findOne({
        where: { id: listingId, type: "AUCTION" },
        attributes: ["id", "currency"],
    });
    if (!listing) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Auction not found" });
    }
    return (0, index_post_1.default)({
        ...data,
        body: {
            listingId,
            amount: body === null || body === void 0 ? void 0 : body.amount,
            currency: listing.currency,
            transactionHash: body === null || body === void 0 ? void 0 : body.transactionHash,
        },
    });
};
