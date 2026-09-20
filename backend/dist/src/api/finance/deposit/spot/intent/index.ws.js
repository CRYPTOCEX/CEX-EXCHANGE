"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.authorizeSubscription = authorizeSubscription;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const intents_1 = require("@b/utils/spot-deposit/intents");
exports.metadata = {
    requiresAuth: true,
    summary: "WebSocket stream for a spot deposit intent's stages",
    description: "Subscribe with { action: 'SUBSCRIBE', payload: { intentId } } to receive { stream: 'intent', data: { intentId, status, stage, ... } } as the deposit moves from waiting to credited.",
    logModule: "SPOT_DEPOSIT",
    logTitle: "Spot deposit intent stream",
};
async function authorizeSubscription(ws, message) {
    var _a, _b;
    const action = message === null || message === void 0 ? void 0 : message.action;
    const payload = message === null || message === void 0 ? void 0 : message.payload;
    if (action !== "SUBSCRIBE" || !payload || !payload.intentId) {
        return { allowed: true };
    }
    const userId = (_a = ws === null || ws === void 0 ? void 0 : ws.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId || ((_b = ws === null || ws === void 0 ? void 0 : ws.user) === null || _b === void 0 ? void 0 : _b.role) === "guest") {
        return { allowed: false, message: "Authentication required" };
    }
    const intentId = String(payload.intentId);
    try {
        const intent = (await db_1.models.spotDepositIntent.findOne({
            where: { id: intentId },
            attributes: ["id", "userId"],
        }));
        if (!intent || String(intent.userId) !== String(userId)) {
            console_1.logger.warn("SPOT_DEPOSIT", `Denied intent subscription: user ${userId} does not own intent ${intentId}`);
            return { allowed: false, message: "Unauthorized access to this deposit" };
        }
        return { allowed: true };
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `Intent subscription check failed for ${intentId}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`, error);
        return { allowed: false, message: "Subscription check failed" };
    }
}
exports.default = async (data, message) => {
    var _a;
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        return;
    let parsed = message;
    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        }
        catch (error) {
            console_1.logger.error("SPOT_DEPOSIT", `Invalid JSON on the intent stream: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
            return;
        }
    }
    if ((parsed === null || parsed === void 0 ? void 0 : parsed.action) !== "SUBSCRIBE")
        return;
    const intentId = (_a = parsed === null || parsed === void 0 ? void 0 : parsed.payload) === null || _a === void 0 ? void 0 : _a.intentId;
    if (!intentId)
        return;
    try {
        const intent = (await db_1.models.spotDepositIntent.findOne({ where: { id: String(intentId) } }));
        if (!intent || String(intent.userId) !== String(user.id))
            return;
        const plain = (0, intents_1.serialiseIntent)(intent);
        (0, intents_1.broadcastIntent)(intent, {
            message: "Subscribed",
            expiresAt: plain.expiresAt instanceof Date ? plain.expiresAt.toISOString() : plain.expiresAt,
            sendBy: plain.sendBy,
        });
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `Could not send the catch-up frame for intent ${intentId}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
};
