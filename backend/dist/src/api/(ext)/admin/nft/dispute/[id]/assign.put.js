"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Assign an NFT dispute to an admin user",
    operationId: "adminAssignNftDispute",
    tags: ["Admin", "NFT", "Dispute"],
    description: "Assign a dispute to an admin by their user id. Pass null/empty to unassign.",
    logModule: "ADMIN_NFT",
    logTitle: "Assign NFT Dispute",
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
                        assignedToId: {
                            type: "string",
                            nullable: true,
                            description: "Admin user id to assign, or null to unassign",
                        },
                    },
                    required: ["assignedToId"],
                },
            },
        },
    },
    responses: {
        200: { description: "Dispute assignment updated successfully" },
        400: { description: "Invalid assignee" },
        404: { description: "Dispute not found" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
    permission: "edit.nft.dispute",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { assignedToId } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching dispute ${id}`);
    const dispute = await db_1.models.nftDispute.findByPk(id);
    if (!dispute) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Dispute not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Dispute not found" });
    }
    if (assignedToId) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating assignee");
        const assignee = await db_1.models.user.findByPk(assignedToId);
        if (!assignee) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Assignee not found");
            throw (0, error_1.createError)({ statusCode: 400, message: "Assignee not found" });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating assignment");
    await dispute.update({ assignedToId: assignedToId || null });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Dispute assignment updated successfully");
    return {
        message: "Dispute assignment updated successfully",
        data: dispute,
    };
};
