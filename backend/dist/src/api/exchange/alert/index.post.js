"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../watchlist/utils");
const price_1 = require("./price");
const utils_2 = require("./utils");
const rules_1 = require("./rules");
exports.metadata = {
    summary: "Create a Price Alert",
    operationId: "createPriceAlert",
    tags: ["Exchange", "Alerts"],
    description: "Arms a price alert for the authenticated user. The alert is evaluated " +
        "server-side, so it fires whether or not the browser is open.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        symbol: { type: "string", description: "e.g. BTC/USDT" },
                        type: {
                            type: "string",
                            enum: ["SPOT", "ECO", "FUTURES"],
                            description: "Market family (defaults to SPOT)",
                        },
                        condition: {
                            type: "string",
                            enum: ["CROSSES_ABOVE", "CROSSES_BELOW", "CROSSES"],
                        },
                        targetPrice: { type: "number" },
                        isRepeating: {
                            type: "boolean",
                            description: "Re-arm after firing (60s cooldown)",
                        },
                        note: { type: "string", nullable: true },
                        expiresAt: {
                            type: "string",
                            nullable: true,
                            description: "Optional expiry, ISO date or epoch milliseconds",
                        },
                    },
                    required: ["symbol", "condition", "targetPrice"],
                },
            },
        },
    },
    responses: (0, query_1.createRecordResponses)("Price Alert"),
    requiresAuth: true,
    logModule: "EXCHANGE",
    logTitle: "Create Price Alert",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const now = Date.now();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating alert");
    let type;
    let condition;
    let targetPrice;
    let expiresAt;
    try {
        type = (0, rules_1.parseMarketType)(body === null || body === void 0 ? void 0 : body.type);
        (0, rules_1.parseSymbol)(body === null || body === void 0 ? void 0 : body.symbol);
        condition = (0, rules_1.parseCondition)(body === null || body === void 0 ? void 0 : body.condition);
        targetPrice = (0, rules_1.parseTargetPrice)(body === null || body === void 0 ? void 0 : body.targetPrice);
        expiresAt = (0, rules_1.parseExpiresAt)(body === null || body === void 0 ? void 0 : body.expiresAt, now);
    }
    catch (error) {
        throw (0, utils_2.toHttpError)(error);
    }
    const symbol = await (0, utils_1.assertWatchableSymbol)(body === null || body === void 0 ? void 0 : body.symbol, type);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking alert allowance");
    const activeCount = await db_1.models.exchangePriceAlert.count({
        where: { userId: user.id, status: "ACTIVE" },
    });
    if (activeCount >= rules_1.MAX_ALERTS_PER_USER) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `You can have at most ${rules_1.MAX_ALERTS_PER_USER} active alerts. Delete one first.`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Reading the current price for ${symbol}`);
    const armedPrice = await (0, price_1.resolveOnePrice)(symbol, type);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating alert");
    const created = await db_1.models.exchangePriceAlert.create({
        userId: user.id,
        symbol,
        type,
        condition,
        targetPrice,
        status: "ACTIVE",
        isRepeating: (body === null || body === void 0 ? void 0 : body.isRepeating) === true,
        note: typeof (body === null || body === void 0 ? void 0 : body.note) === "string" ? body.note.slice(0, 255) : null,
        armedPrice,
        lastPrice: armedPrice,
        expiresAt,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Armed ${condition} ${targetPrice} on ${symbol}`);
    return {
        message: "Price alert created",
        alert: (0, utils_2.serializeAlert)(created),
    };
};
