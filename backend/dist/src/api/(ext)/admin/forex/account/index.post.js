"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Creates a new Forex account",
    operationId: "storeForexAccount",
    tags: ["Admin", "Forex", "Account"],
    description: "Creates a new Forex account for a user with specified broker, MetaTrader version, balance, leverage, and account type (DEMO/LIVE).",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.forexAccountUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.forexAccountStoreSchema, "Forex Account"),
    requiresAuth: true,
    permission: "create.forex.account",
    logModule: "ADMIN_FOREX",
    logTitle: "Create forex account",
};
exports.default = async (data) => {
    var _a;
    const { body, ctx } = data;
    const { userId, accountId, password, broker, mt, balance, leverage, type, status, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating forex account data");
    const duplicate = await db_1.models.forexAccount.findOne({
        where: { userId, type },
    });
    if (duplicate) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: `That user already has a ${type} forex account (${(_a = duplicate.accountId) !== null && _a !== void 0 ? _a : duplicate.id}). ` +
                `Edit it instead — a second one would split their balance across two rows.`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating forex account");
    const result = await (0, query_1.storeRecord)({
        model: "forexAccount",
        data: {
            userId,
            accountId,
            password,
            broker,
            mt,
            balance,
            leverage,
            type,
            status,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex account created successfully");
    return result;
};
