"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const delete_guard_1 = require("../delete-guard");
exports.metadata = {
    summary: "Updates an existing wallet",
    operationId: "updateWallet",
    tags: ["Admin", "Wallets"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "The ID of the wallet to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated data for the wallet",
        content: {
            "application/json": {
                schema: utils_1.walletUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Wallet"),
    requiresAuth: true,
    permission: "edit.wallet",
    logModule: "ADMIN_FIN",
    logTitle: "Update Wallet",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    if ("balance" in body || "inOrder" in body) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Balance cannot be edited directly. Use POST /api/admin/finance/wallet/:id/balance for audited balance adjustments.",
        });
    }
    const allowedUpdate = {};
    if ("status" in body)
        allowedUpdate.status = body.status;
    if ("address" in body)
        allowedUpdate.address = body.address;
    if ("metadata" in body)
        allowedUpdate.metadata = body.metadata;
    const wallet = await db_1.models.wallet.findOne({ where: { id } });
    if (!wallet) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
    }
    await (0, delete_guard_1.assertWalletsNotSystemOwned)([id], "edited by hand");
    if (Object.keys(allowedUpdate).length > 0) {
        await db_1.models.wallet.update(allowedUpdate, { where: { id } });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Wallet updated successfully");
    return {
        message: "Wallet updated successfully",
    };
};
