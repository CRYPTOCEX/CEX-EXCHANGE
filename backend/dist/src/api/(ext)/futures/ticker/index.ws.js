"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const Websocket_1 = require("@b/handler/Websocket");
const matchingEngine_1 = require("@b/api/(ext)/futures/utils/matchingEngine");
exports.metadata = {
    logModule: "FUTURES",
    logTitle: "Futures ticker websocket",
};
exports.default = async (data, message) => {
    var _a, _b, _c, _d;
    const { ctx } = data;
    if (typeof message === "string") {
        message = JSON.parse(message);
    }
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Initializing futures matching engine");
    const engine = await matchingEngine_1.FuturesMatchingEngine.getInstance();
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Fetching all futures tickers");
    const tickers = await engine.getTickers();
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Broadcasting tickers to subscribed clients");
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/futures/ticker`, { type: "tickers" }, {
        stream: "tickers",
        data: tickers,
    });
    (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, "Ticker data broadcasted successfully");
};
