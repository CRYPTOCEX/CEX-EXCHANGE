"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const settings_1 = require("@b/utils/spot-deposit/settings");
const intents_1 = require("@b/utils/spot-deposit/intents");
exports.metadata = {
    summary: "Lists the caller's spot deposit intents in flight",
    description: "Returns the authenticated user's OPEN, MATCHED and SWEEPING spot deposit intents, newest first, with the platform's current spot deposit mode.",
    operationId: "listSpotDepositIntents",
    tags: ["Finance", "Deposit"],
    requiresAuth: true,
    logModule: "SPOT_DEPOSIT",
    logTitle: "List spot deposit intents",
    responses: {
        200: {
            description: "Intents in flight",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            mode: { type: "string", enum: ["hash_claim", "amount_match", "ecosystem_custody"] },
                            intents: { type: "array", items: { type: "object" } },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const [mode, rows] = await Promise.all([(0, settings_1.getSpotDepositMode)(), (0, intents_1.listActiveIntents)(user.id)]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${rows.length} intent(s) in flight`);
    return { mode, intents: rows.map((row) => (0, intents_1.serialiseIntent)(row)) };
};
