"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealizedPnLReconciler = void 0;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
class RealizedPnLReconciler {
    constructor() {
        this.lastSeen = new Map();
        this.baselined = new Set();
    }
    async reconcile(marketMakerId) {
        try {
            const bots = await db_1.models.aiBot.findAll({
                where: { marketMakerId },
                attributes: ["id", "totalRealizedPnL"],
            });
            if (!bots.length)
                return null;
            let delta = 0;
            let comparable = 0;
            for (const bot of bots) {
                const key = `${marketMakerId}:${bot.id}`;
                const current = Number(bot.totalRealizedPnL) || 0;
                const previous = this.lastSeen.get(key);
                this.lastSeen.set(key, current);
                if (previous === undefined)
                    continue;
                delta += current - previous;
                comparable++;
            }
            if (!this.baselined.has(marketMakerId)) {
                this.baselined.add(marketMakerId);
                return null;
            }
            if (comparable === 0)
                return null;
            if (!Number.isFinite(delta) || delta === 0)
                return null;
            return delta;
        }
        catch (error) {
            console_1.logger.debug("AI_MM", `Realised P&L reconcile failed for ${marketMakerId}`, error);
            return null;
        }
    }
    forget(marketMakerId) {
        this.baselined.delete(marketMakerId);
        for (const key of [...this.lastSeen.keys()]) {
            if (key.startsWith(`${marketMakerId}:`))
                this.lastSeen.delete(key);
        }
    }
    reset() {
        this.lastSeen.clear();
        this.baselined.clear();
    }
}
exports.RealizedPnLReconciler = RealizedPnLReconciler;
exports.default = RealizedPnLReconciler;
