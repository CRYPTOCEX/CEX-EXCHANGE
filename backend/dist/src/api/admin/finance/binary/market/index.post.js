"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Stores a new Binary Market",
    operationId: "storeBinaryMarket",
    tags: ["Admin", "Binary Markets"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.BinaryMarketUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.BinaryMarketStoreSchema, "Binary Market"),
    requiresAuth: true,
    permission: "create.binary.market",
    logModule: "ADMIN_BINARY",
    logTitle: "Create binary market",
};
async function resolveSource(currency, pair, requested) {
    var _a;
    if (requested === "ECOSYSTEM" || requested === "EXCHANGE") {
        if (requested === "ECOSYSTEM") {
            const ecosystemMarket = await ((_a = db_1.models.ecosystemMarket) === null || _a === void 0 ? void 0 : _a.findOne({
                where: { currency, pair },
            }));
            if (!ecosystemMarket) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `No ecosystem market exists for ${currency}/${pair}. Create the ecosystem market first, or import this pair from the exchange instead.`,
                });
            }
        }
        return requested;
    }
    const exchangeMarket = await db_1.models.exchangeMarket.findOne({
        where: { currency, pair },
    });
    const ecosystemMarket = db_1.models.ecosystemMarket
        ? await db_1.models.ecosystemMarket.findOne({ where: { currency, pair } })
        : null;
    if (!exchangeMarket && ecosystemMarket)
        return "ECOSYSTEM";
    return "EXCHANGE";
}
exports.default = async (data) => {
    const { body, ctx } = data;
    const { currency, pair, source, isTrending, isHot, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating binary market data");
    const resolvedSource = await resolveSource(currency, pair, source);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating binary market record");
    const result = await (0, query_1.storeRecord)({
        model: "binaryMarket",
        data: {
            currency,
            pair,
            source: resolvedSource,
            isTrending: isTrending !== undefined ? isTrending : false,
            isHot: isHot !== undefined ? isHot : false,
            status: status !== undefined ? status : true,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Binary market created successfully");
    return result;
};
