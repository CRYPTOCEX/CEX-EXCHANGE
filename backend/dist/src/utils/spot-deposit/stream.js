"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastIntentStage = broadcastIntentStage;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const intents_1 = require("./intents");
async function broadcastIntentStage(intentId, stage, extra = {}) {
    const id = String(intentId !== null && intentId !== void 0 ? intentId : "").trim();
    if (!id)
        return;
    try {
        const row = await db_1.models.spotDepositIntent.findOne({ where: { id } });
        if (!row) {
            console_1.logger.debug("SPOT_DEPOSIT", `Intent ${id} is gone; no stage frame sent`);
            return;
        }
        (0, intents_1.broadcastIntent)(row, { ...(stage ? { stage } : {}), ...extra });
    }
    catch (error) {
        console_1.logger.debug("SPOT_DEPOSIT", `Could not push a stage frame for intent ${id}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
}
