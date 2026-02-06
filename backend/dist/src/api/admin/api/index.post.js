"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const utils_2 = require("@b/api/user/api-key/utils");
exports.metadata = {
    summary: "Stores a new API Key",
    operationId: "storeApiKey",
    tags: ["Admin", "API Keys"],
    logModule: "ADMIN_API",
    logTitle: "Create API",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.apiKeyUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.apiKeyStoreSchema, "API Key"),
    requiresAuth: true,
    permission: "create.api.key",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { userId, name, type, permissions, ipRestriction, ipWhitelist } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating API key data");
    const formattedPermissions = Array.isArray(permissions) ? permissions : [];
    const formattedIPWhitelist = Array.isArray(ipWhitelist) ? ipWhitelist : [];
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating API key");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating API key record");
    const result = await (0, query_1.storeRecord)({
        model: "apiKey",
        data: {
            userId,
            name,
            key: (0, utils_2.generateApiKey)(),
            type,
            permissions: formattedPermissions,
            ipRestriction,
            ipWhitelist: formattedIPWhitelist,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
