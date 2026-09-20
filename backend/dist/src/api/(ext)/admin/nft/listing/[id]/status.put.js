"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Toggle NFT listing status",
    operationId: "adminToggleNftListingStatus",
    tags: ["Admin", "NFT", "Listing"],
    description: "Admin-only disable/enable switch for a user-created NFT listing. Accepts a boolean and maps it to the nftListing enum: true -> ACTIVE, false -> CANCELLED.",
    logModule: "ADMIN_NFT",
    logTitle: "Toggle NFT Listing Status",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Listing ID",
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
                            description: "true to activate, false to cancel/disable",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Listing"),
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching listing ${id}`);
    const listing = await db_1.models.nftListing.findByPk(id);
    if (!listing) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Listing not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Listing not found" });
    }
    const nextStatus = status ? "ACTIVE" : "CANCELLED";
    const updateData = { status: nextStatus };
    if (!status) {
        updateData.cancelledAt = new Date();
        if (listing.status === "ACTIVE" && listing.tokenId) {
            await db_1.models.nftToken.update({ isListed: false }, { where: { id: listing.tokenId } });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Setting listing status to ${nextStatus}`);
    await listing.update(updateData);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Listing status updated successfully");
    return { message: "Listing status updated successfully" };
};
