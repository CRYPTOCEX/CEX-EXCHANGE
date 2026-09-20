"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "List messages for an NFT dispute",
    operationId: "adminGetNftDisputeMessages",
    tags: ["Admin", "NFT", "Dispute"],
    description: "Returns the chronological message thread for a dispute, including the user who posted each message.",
    logModule: "ADMIN_NFT",
    logTitle: "NFT Dispute Messages",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Dispute ID",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Messages retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: { type: "object" },
                    },
                },
            },
        },
        404: { description: "Dispute not found" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
    permission: "access.nft.dispute",
    demoMask: ["user.email"],
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Locating dispute ${id}`);
    const dispute = await db_1.models.nftDispute.findByPk(id);
    if (!dispute) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Dispute not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Dispute not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching dispute messages");
    const messages = await db_1.models.nftDisputeMessage.findAll({
        where: { disputeId: id },
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
        order: [["createdAt", "ASC"]],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Messages retrieved");
    return messages;
};
