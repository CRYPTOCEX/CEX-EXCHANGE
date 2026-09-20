"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Toggle NFT token status",
    operationId: "adminToggleNftTokenStatus",
    tags: ["Admin", "NFT", "Token"],
    description: "Admin-only disable/enable switch for a user-created NFT token. Accepts a boolean: true -> MINTED (active), false -> BURNED (disabled). Does not create/edit/remove the token.",
    logModule: "ADMIN_NFT",
    logTitle: "Toggle NFT Token Status",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Token ID",
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
                            description: "true to mark MINTED (active), false to mark BURNED (disabled)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Token"),
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching token ${id}`);
    const token = await db_1.models.nftToken.findByPk(id);
    if (!token) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Token not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Token not found" });
    }
    const nextStatus = status ? "MINTED" : "BURNED";
    const updateData = { status: nextStatus };
    if (!status) {
        updateData.isListed = false;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Setting token status to ${nextStatus}`);
    await token.update(updateData);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Token status updated successfully");
    return { message: "Token status updated successfully" };
};
