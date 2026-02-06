"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
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
exports.default = async (data) => {
    const { body, ctx } = data;
    const { currency, pair, isTrending, isHot, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating binary market data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating binary market record");
    const result = await (0, query_1.storeRecord)({
        model: "binaryMarket",
        data: {
            currency,
            pair,
            isTrending: isTrending !== undefined ? isTrending : false,
            isHot: isHot !== undefined ? isHot : false,
            status: status !== undefined ? status : true,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Binary market created successfully");
    return result;
};
