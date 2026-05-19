"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
exports.metadata = {
    logModule: "FUTURES",
    logTitle: "Order WebSocket connection"
};
exports.default = async (data, message) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing futures order WebSocket message");
    if (typeof message === "string") {
        message = JSON.parse(message);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Futures order WebSocket message processed");
};
