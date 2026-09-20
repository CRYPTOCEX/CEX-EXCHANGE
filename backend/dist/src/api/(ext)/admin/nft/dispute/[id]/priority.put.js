"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
exports.metadata = {
    summary: "Update NFT dispute priority",
    operationId: "adminUpdateNftDisputePriority",
    tags: ["Admin", "NFT", "Dispute"],
    description: "Adjust a dispute's priority. Accepts LOW, MEDIUM, HIGH, or CRITICAL.",
    logModule: "ADMIN_NFT",
    logTitle: "Update NFT Dispute Priority",
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
                        priority: {
                            type: "string",
                            enum: [...VALID_PRIORITIES],
                        },
                    },
                    required: ["priority"],
                },
            },
        },
    },
    responses: {
        200: { description: "Dispute priority updated successfully" },
        400: { description: "Invalid priority" },
        404: { description: "Dispute not found" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
    permission: "edit.nft.dispute",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { priority } = body;
    if (!VALID_PRIORITIES.includes(priority)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid priority" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching dispute ${id}`);
    const dispute = await db_1.models.nftDispute.findByPk(id);
    if (!dispute) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Dispute not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Dispute not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Setting dispute priority to ${priority}`);
    await dispute.update({ priority });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Dispute priority updated successfully");
    return {
        message: "Dispute priority updated successfully",
        data: dispute,
    };
};
