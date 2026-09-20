"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const VALID_STATUSES = [
    "PENDING",
    "INVESTIGATING",
    "AWAITING_RESPONSE",
    "RESOLVED",
    "REJECTED",
    "ESCALATED",
];
exports.metadata = {
    summary: "Update NFT dispute status",
    operationId: "adminUpdateNftDisputeStatus",
    tags: ["Admin", "NFT", "Dispute"],
    description: "Move a dispute to a different status. Automatically stamps investigatedAt/escalatedAt/resolvedAt as appropriate.",
    logModule: "ADMIN_NFT",
    logTitle: "Update NFT Dispute Status",
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
                        status: {
                            type: "string",
                            enum: [...VALID_STATUSES],
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: {
        200: { description: "Dispute status updated successfully" },
        400: { description: "Invalid status" },
        404: { description: "Dispute not found" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
    permission: "edit.nft.dispute",
};
exports.default = async (data) => {
    const { body, params, user, ctx } = data;
    const { id } = params;
    const { status } = body;
    if (!VALID_STATUSES.includes(status)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid dispute status" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching dispute ${id}`);
    const dispute = await db_1.models.nftDispute.findByPk(id);
    if (!dispute) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Dispute not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Dispute not found" });
    }
    const updateData = { status };
    const now = new Date();
    if (status === "INVESTIGATING" && !dispute.investigatedAt) {
        updateData.investigatedAt = now;
    }
    if (status === "ESCALATED" && !dispute.escalatedAt) {
        updateData.escalatedAt = now;
    }
    if (status === "RESOLVED") {
        updateData.resolvedAt = now;
        if (user === null || user === void 0 ? void 0 : user.id)
            updateData.resolvedById = user.id;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Setting dispute status to ${status}`);
    await dispute.update(updateData);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Dispute status updated successfully");
    return {
        message: "Dispute status updated successfully",
        data: dispute,
    };
};
