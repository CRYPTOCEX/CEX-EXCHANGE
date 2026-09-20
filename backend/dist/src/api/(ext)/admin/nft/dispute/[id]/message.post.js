"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Post a message to an NFT dispute thread",
    operationId: "adminPostNftDisputeMessage",
    tags: ["Admin", "NFT", "Dispute"],
    description: "Admin posts a message into the dispute thread. Supports an `isInternal` flag for notes only visible to admins.",
    logModule: "ADMIN_NFT",
    logTitle: "Post NFT Dispute Message",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Dispute ID",
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
                        message: { type: "string" },
                        isInternal: { type: "boolean" },
                    },
                    required: ["message"],
                },
            },
        },
    },
    responses: {
        200: { description: "Message posted successfully" },
        400: { description: "Invalid payload" },
        401: { description: "Unauthorized" },
        404: { description: "Dispute not found" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
    permission: "edit.nft.dispute",
};
exports.default = async (data) => {
    const { body, params, user, ctx } = data;
    const { id } = params;
    const { message, isInternal } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Message is required" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching dispute ${id}`);
    const dispute = await db_1.models.nftDispute.findByPk(id);
    if (!dispute) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Dispute not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Dispute not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating dispute message");
    const created = await db_1.models.nftDisputeMessage.create({
        disputeId: id,
        userId: user.id,
        message: message.trim(),
        isInternal: !!isInternal,
        isSystemMessage: false,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Message posted successfully");
    return {
        message: "Message posted successfully",
        data: created,
    };
};
