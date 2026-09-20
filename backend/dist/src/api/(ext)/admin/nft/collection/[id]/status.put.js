"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Toggle NFT collection status",
    operationId: "adminToggleNftCollectionStatus",
    tags: ["Admin", "NFT", "Collection"],
    description: "Admin-only disable/enable switch for a user-created NFT collection. Accepts a boolean: true -> ACTIVE, false -> SUSPENDED.",
    logModule: "ADMIN_NFT",
    logTitle: "Toggle NFT Collection Status",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Collection ID",
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
                            description: "true to activate, false to suspend/disable",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Collection"),
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching collection ${id}`);
    const collection = await db_1.models.nftCollection.findByPk(id);
    if (!collection) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Collection not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Collection not found" });
    }
    const nextStatus = status ? "ACTIVE" : "SUSPENDED";
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Setting collection status to ${nextStatus}`);
    await collection.update({ status: nextStatus });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Collection status updated successfully");
    return { message: "Collection status updated successfully" };
};
