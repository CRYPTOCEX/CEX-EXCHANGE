"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Settle NFT auction (retired)",
    operationId: "settleAuction",
    tags: ["NFT", "Auction"],
    logModule: "NFT",
    logTitle: "Settle auction (retired)",
    description: "Retired. Use POST /api/nft/auction/{id}/settle, which requires a deployed auction contract and claims the listing atomically before settling.",
    deprecated: true,
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        listingId: { type: "string", format: "uuid" },
                    },
                },
            },
        },
    },
    responses: {
        410: { description: "Gone - use POST /api/nft/auction/{id}/settle" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a;
    const listingId = (_a = data === null || data === void 0 ? void 0 : data.body) === null || _a === void 0 ? void 0 : _a.listingId;
    throw (0, error_1.createError)({
        statusCode: 410,
        message: listingId
            ? `This endpoint has been retired. Use POST /api/nft/auction/${listingId}/settle instead.`
            : "This endpoint has been retired. Use POST /api/nft/auction/{id}/settle instead.",
    });
};
