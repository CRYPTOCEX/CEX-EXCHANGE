"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves a Forex account by ID",
    operationId: "getForexAccountById",
    tags: ["Admin", "Forex", "Account"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the forex account to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Forex account details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseForexAccountSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Account"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.forex.account",
    requiresAuth: true,
    logModule: "ADMIN_FOREX",
    logTitle: "Get Forex Account",
    demoMask: ["user.email", "accountId", "password", "broker"],
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching forex account record");
    const result = await (0, query_1.getRecord)("forexAccount", params.id, [
        {
            model: db_1.models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Retrieved forex account");
    return result;
};
