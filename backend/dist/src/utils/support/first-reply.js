"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFirstHumanAgentReply = isFirstHumanAgentReply;
function isFirstHumanAgentReply(messages) {
    if (!Array.isArray(messages))
        return true;
    return !messages.some((message) => { var _a; return String((_a = message === null || message === void 0 ? void 0 : message.type) !== null && _a !== void 0 ? _a : "").toLowerCase() === "agent" &&
        (message === null || message === void 0 ? void 0 : message.ai) !== true; });
}
