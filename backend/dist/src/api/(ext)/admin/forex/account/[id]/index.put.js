"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a Forex account",
    operationId: "updateForexAccount",
    tags: ["Admin", "Forex", "Account"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the Forex Account to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the Forex Account",
        content: {
            "application/json": {
                schema: utils_1.forexAccountUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Forex Account"),
    requiresAuth: true,
    permission: "edit.forex.account",
    logModule: "ADMIN_FOREX",
    logTitle: "Update forex account",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { userId, accountId, password, broker, mt, balance, leverage, type, status, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating forex account data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating forex account ${id}`);
    const result = await (0, query_1.updateRecord)("forexAccount", id, {
        userId,
        accountId,
        password,
        broker,
        mt,
        balance,
        leverage,
        type,
        status,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex account updated successfully");
    return result;
};
