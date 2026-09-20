"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Toggle NFT auction (listing) status",
    operationId: "adminToggleNftAuctionStatus",
    tags: ["Admin", "NFT", "Auction"],
    description: "Admin-only disable/enable switch for a user-created NFT auction. Accepts a boolean and maps it to the nftListing enum: true -> ACTIVE, false -> CANCELLED.",
    logModule: "ADMIN_NFT",
    logTitle: "Toggle NFT Auction Status",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Auction (listing) ID",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "boolean",
                            description: "true to re-activate, false to disable/cancel",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Auction"),
    requiresAuth: true,
    permission: "edit.nft",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    if (typeof status !== "boolean") {
        throw (0, error_1.createError)({ statusCode: 400, message: "status must be a boolean" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching auction ${id}`);
    const listing = await db_1.models.nftListing.findByPk(id);
    if (!listing) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Auction not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Auction not found" });
    }
    const nextStatus = status ? "ACTIVE" : "CANCELLED";
    const updateData = { status: nextStatus };
    if (!status) {
        updateData.cancelledAt = new Date();
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Setting auction status to ${nextStatus}`);
    await listing.update(updateData);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Auction status updated successfully");
    return { message: "Auction status updated successfully" };
};
