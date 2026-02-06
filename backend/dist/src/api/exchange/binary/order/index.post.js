"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const BinaryOrderService_1 = require("./util/BinaryOrderService");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Create Binary Order",
    operationId: "createBinaryOrder",
    tags: ["Binary", "Orders"],
    description: "Creates a new binary order for the authenticated user. Requires an idempotency-key header to prevent duplicate orders on network retries.",
    parameters: [
        {
            name: "idempotency-key",
            in: "header",
            required: true,
            schema: { type: "string" },
            description: "Unique key to prevent duplicate order creation on retries. If an order with this key already exists for the user, the existing order will be returned instead of creating a duplicate.",
        },
    ],
    requestBody: {
        description: "Binary order data to be created.",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        currency: { type: "string" },
                        pair: { type: "string" },
                        amount: { type: "number" },
                        side: { type: "string" },
                        closedAt: { type: "string", format: "date-time" },
                        durationId: { type: "string" },
                        isDemo: { type: "boolean" },
                        type: { type: "string" },
                        durationType: { type: "string" },
                        barrier: { type: "number" },
                        barrierLevelId: { type: "string" },
                        strikePrice: { type: "number" },
                        strikeLevelId: { type: "string" },
                        payoutPerPoint: { type: "number" },
                    },
                    required: ["currency", "pair", "amount", "side", "closedAt", "durationId", "type"],
                },
            },
        },
        required: true,
    },
    responses: (0, query_1.createRecordResponses)("Binary Order"),
    requiresAuth: true,
    rateLimit: {
        windowMs: 60000,
        max: 10,
    },
    logModule: "BINARY",
    logTitle: "Create binary order",
};
exports.default = async (data) => {
    const { user, body, ctx, headers } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { isDemo } = body;
    const cacheManager = cache_1.CacheManager.getInstance();
    const binaryStatus = (await cacheManager.getSetting("binaryStatus")) === "true";
    const binaryPracticeStatus = (await cacheManager.getSetting("binaryPracticeStatus")) === "true";
    if (!binaryStatus) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Binary trading is currently disabled",
        });
    }
    if (isDemo && !binaryPracticeStatus) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Binary practice mode is currently disabled",
        });
    }
    const idempotencyKey = headers === null || headers === void 0 ? void 0 : headers['idempotency-key'];
    if (!idempotencyKey) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing idempotency-key header. This header is required to prevent duplicate orders.",
        });
    }
    const { currency, pair, amount, side, type, durationId, durationType, barrier, barrierLevelId, strikePrice, strikeLevelId, payoutPerPoint, closedAt, } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating order parameters");
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking wallet balance for ${pair}`);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching market data and binary duration");
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deducting ${amount} ${pair} from wallet`);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching current market price");
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating binary order record");
        const order = await BinaryOrderService_1.BinaryOrderService.createOrder({
            userId: user.id,
            currency,
            pair,
            amount,
            side,
            type,
            durationId,
            durationType,
            barrier,
            barrierLevelId,
            strikePrice,
            strikeLevelId,
            payoutPerPoint,
            closedAt,
            isDemo,
            idempotencyKey,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Scheduling order expiry processing");
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Opened ${side} ${isDemo ? 'DEMO' : ''} position on ${currency}/${pair} for ${amount} ${pair}`);
        return {
            order,
            message: "Binary order created successfully",
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to create binary order");
        throw (0, error_1.createError)({
            statusCode: (error === null || error === void 0 ? void 0 : error.statusCode) || 500,
            message: error.message || "An error occurred while creating the order",
        });
    }
};
