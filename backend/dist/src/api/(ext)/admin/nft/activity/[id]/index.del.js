"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Delete NFT activity entry",
    operationId: "adminDeleteNftActivity",
    tags: ["Admin", "NFT", "Activity"],
    description: "Permanently delete a single NFT activity log entry. Hard delete (bypasses paranoid soft-delete).",
    logModule: "ADMIN_NFT",
    logTitle: "Delete NFT Activity",
    parameters: (0, query_1.deleteRecordParams)("activity"),
    responses: (0, query_1.deleteRecordResponses)("Activity"),
    requiresAuth: true,
    permission: "delete.nft",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Locating activity ${id}`);
    const activity = await db_1.models.nftActivity.findByPk(id, { paranoid: false });
    if (!activity) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Activity not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Activity not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting activity (hard delete)");
    await activity.destroy({ force: true });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Activity deleted successfully");
    return { message: "Activity deleted successfully" };
};
