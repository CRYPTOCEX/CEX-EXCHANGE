"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const nft_auth_1 = require("@b/api/(ext)/nft/utils/nft-auth");
const index_post_1 = __importDefault(require("@b/api/(ext)/nft/bid/index.post"));
const storefront_1 = require("@b/utils/storefront");
exports.metadata = {
    summary: "Place bid on NFT auction",
    operationId: "placeAuctionBid",
    tags: ["NFT", "Auction"],
    logModule: "NFT",
    logTitle: "Place Auction Bid",
    description: "Deprecated alias for POST /api/nft/bid. Kept for API compatibility; it delegates to the canonical handler so the per-listing minimum increment, start-time and currency checks all apply.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        listingId: { type: "string", format: "uuid", description: "Auction listing ID" },
                        bidAmount: { type: "number", minimum: 0, description: "Bid amount in native currency" },
                        transactionHash: { type: "string", description: "Blockchain transaction hash" },
                    },
                    required: ["listingId", "bidAmount"],
                },
            },
        },
    },
    responses: {
        200: { description: "Bid placed successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Cannot bid on own auction" },
        404: { description: "Auction not found" },
        409: { description: "Auction ended or bid too low" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    (0, storefront_1.assertPurchaseAllowedOnNativeApp)(data, "place bids");
    const { body } = data;
    const { listingId, bidAmount, transactionHash } = body !== null && body !== void 0 ? body : {};
    if (!listingId || !bidAmount) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Listing ID and bid amount are required",
        });
    }
    const sanitizedListingId = (0, nft_auth_1.sanitizeAuthInput)(listingId);
    const listing = await db_1.models.nftListing.findOne({
        where: { id: sanitizedListingId, type: "AUCTION" },
        attributes: ["id", "currency"],
    });
    if (!listing) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Auction not found" });
    }
    return (0, index_post_1.default)({
        ...data,
        body: {
            listingId: sanitizedListingId,
            amount: bidAmount,
            currency: listing.currency,
            transactionHash,
        },
    });
};
