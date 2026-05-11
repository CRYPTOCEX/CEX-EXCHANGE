"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const Websocket_1 = require("@b/handler/Websocket");
const matchingEngine_1 = require("@b/api/(ext)/ecosystem/utils/matchingEngine");
exports.metadata = {
    logModule: "ECOSYSTEM",
    logTitle: "Ticker WebSocket connection"
};
exports.default = async (data, message) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing ticker WebSocket message");
    if (typeof message === "string") {
        message = JSON.parse(message);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching tickers from matching engine");
    const engine = await matchingEngine_1.MatchingEngine.getInstance();
    const tickers = await engine.getTickers();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting tickers to subscribers");
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/ecosystem/ticker`, { type: "tickers" }, {
        stream: "tickers",
        data: tickers,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Broadcasted ${Object.keys(tickers || {}).length} tickers`);
};
