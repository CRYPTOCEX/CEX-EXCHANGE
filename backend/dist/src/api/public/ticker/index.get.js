"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const index_get_1 = require("../tickers/index.get");
const utils_1 = require("../utils");
exports.metadata = {
    ...index_get_1.metadata,
    summary: "Aggregator tickers, CoinMarketCap's singular spelling",
    operationId: "getPublicTickerAlias",
    description: `${index_get_1.metadata.description} This path is the singular spelling CoinMarketCap's own spec uses; /api/public/tickers serves the identical document.`,
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Building aggregator tickers");
    const { tickers } = await (0, utils_1.getAggregatorDocuments)();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Published ${Object.keys(tickers).length} tickers`);
    return tickers;
};
