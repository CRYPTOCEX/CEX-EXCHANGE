"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Toggle NFT creator profile public/disabled state",
    operationId: "adminToggleNftCreatorStatus",
    tags: ["Admin", "NFT", "Creator"],
    description: "Admin-only disable/enable switch for a user-created NFT creator profile. The nftCreator model has no status enum; the boolean maps to the `profilePublic` field (true = visible/enabled, false = hidden/disabled).",
    logModule: "ADMIN_NFT",
    logTitle: "Toggle NFT Creator Status",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Creator ID",
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
                            description: "true to keep profile public, false to disable/hide",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Creator"),
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching creator ${id}`);
    const creator = await db_1.models.nftCreator.findByPk(id);
    if (!creator) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Creator not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Creator not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Setting creator profilePublic to ${status ? "true" : "false"}`);
    await creator.update({ profilePublic: status });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Creator status updated successfully");
    return { message: "Creator status updated successfully" };
};
