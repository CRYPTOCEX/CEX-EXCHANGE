"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluatePriceAlerts = evaluatePriceAlerts;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const broadcast_1 = require("../broadcast");
const notification_1 = require("@b/services/notification");
const price_1 = require("@b/api/exchange/alert/price");
const rules_1 = require("@b/api/exchange/alert/rules");
const MAX_ALERTS_PER_TICK = 5000;
async function evaluatePriceAlerts() {
    var _a;
    const cronName = "evaluatePriceAlerts";
    (0, broadcast_1.broadcastStatus)(cronName, "running");
    try {
        const now = Date.now();
        const expired = await db_1.models.exchangePriceAlert.update({ status: "EXPIRED" }, {
            where: {
                status: "ACTIVE",
                expiresAt: { [sequelize_1.Op.ne]: null, [sequelize_1.Op.lt]: new Date(now) },
            },
        });
        const expiredCount = Array.isArray(expired) ? expired[0] : 0;
        if (expiredCount) {
            (0, broadcast_1.broadcastLog)(cronName, `Retired ${expiredCount} expired alert(s)`);
        }
        const alerts = (await db_1.models.exchangePriceAlert.findAll({
            where: { status: "ACTIVE" },
            limit: MAX_ALERTS_PER_TICK,
            order: [["createdAt", "ASC"]],
            raw: true,
        }));
        if (!alerts.length) {
            (0, broadcast_1.broadcastStatus)(cronName, "completed");
            return;
        }
        if (alerts.length === MAX_ALERTS_PER_TICK) {
            console_1.logger.warn("CRON", `evaluatePriceAlerts hit its ${MAX_ALERTS_PER_TICK}-alert ceiling; the newest alerts were not evaluated this tick`);
            (0, broadcast_1.broadcastLog)(cronName, `Ceiling of ${MAX_ALERTS_PER_TICK} alerts reached; some were not evaluated`, "warning");
        }
        const byType = new Map();
        for (const alert of alerts) {
            const type = ((_a = alert.type) !== null && _a !== void 0 ? _a : "SPOT");
            if (!rules_1.ALERT_MARKET_TYPES.includes(type))
                continue;
            const bucket = byType.get(type);
            if (bucket)
                bucket.push(alert);
            else
                byType.set(type, [alert]);
        }
        let firedTotal = 0;
        let pricedTotal = 0;
        for (const [type, bucketAlerts] of byType) {
            const symbols = [...new Set(bucketAlerts.map((a) => a.symbol))];
            let lookup;
            try {
                lookup = await (0, price_1.resolvePrices)(type, symbols);
            }
            catch (error) {
                console_1.logger.error("CRON", `evaluatePriceAlerts could not price ${type} symbols`, error);
                (0, broadcast_1.broadcastLog)(cronName, `Could not price ${type} symbols: ${error === null || error === void 0 ? void 0 : error.message}`, "warning");
                continue;
            }
            if (lookup.note)
                (0, broadcast_1.broadcastLog)(cronName, `${type}: ${lookup.note}`, "info");
            pricedTotal += lookup.prices.size;
            for (const symbol of symbols) {
                const current = lookup.prices.get(symbol);
                if (current === undefined)
                    continue;
                const forSymbol = bucketAlerts.filter((a) => a.symbol === symbol);
                const advancing = [];
                for (const alert of forSymbol) {
                    const previous = typeof alert.lastPrice === "number" ? alert.lastPrice : null;
                    const step = (0, rules_1.nextBaseline)(previous, current);
                    if (!step.evaluate) {
                        if (step.baseline !== previous)
                            advancing.push(alert.id);
                        continue;
                    }
                    const outcome = (0, rules_1.evaluateAlert)(alert, previous, current, now);
                    if (outcome.kind === "expired") {
                        await db_1.models.exchangePriceAlert.update({ status: "EXPIRED", lastPrice: current }, { where: { id: alert.id } });
                        continue;
                    }
                    if (outcome.kind === "triggered") {
                        await db_1.models.exchangePriceAlert.update({
                            status: outcome.nextStatus,
                            triggeredAt: new Date(now),
                            triggeredPrice: current,
                            lastPrice: current,
                        }, { where: { id: alert.id } });
                        firedTotal += 1;
                        await notifyAlert(alert, previous, current, now);
                        continue;
                    }
                    advancing.push(alert.id);
                }
                if (advancing.length) {
                    await db_1.models.exchangePriceAlert.update({ lastPrice: current }, { where: { id: { [sequelize_1.Op.in]: advancing } } });
                }
            }
        }
        (0, broadcast_1.broadcastLog)(cronName, `Evaluated ${alerts.length} alert(s) across ${pricedTotal} priced symbol(s); ${firedTotal} fired`, firedTotal ? "success" : "info");
        (0, broadcast_1.broadcastStatus)(cronName, "completed");
    }
    catch (error) {
        console_1.logger.error("CRON", "evaluatePriceAlerts failed", error);
        (0, broadcast_1.broadcastLog)(cronName, `Failed: ${error === null || error === void 0 ? void 0 : error.message}`, "error");
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        throw error;
    }
}
function tradeLink(alert) {
    const symbol = alert.symbol.replace("/", "-");
    if (alert.type === "FUTURES")
        return `/trade?symbol=${symbol}&type=futures`;
    if (alert.type === "ECO")
        return `/trade?symbol=${symbol}&type=spot-eco`;
    return `/trade?symbol=${symbol}`;
}
async function notifyAlert(alert, previous, current, firedAt) {
    try {
        const template = notification_1.pushTemplateEngine.getCommonTemplates().PRICE_ALERT;
        const rendered = notification_1.pushTemplateEngine.render(template.title, template.body, {
            pair: alert.symbol,
            price: (0, rules_1.formatAlertPrice)(current),
            change: (0, rules_1.describeChange)(previous, current),
        });
        const message = alert.note
            ? `${rendered.body} — ${alert.note}`
            : rendered.body;
        const registered = notification_1.notificationService.getRegisteredChannels();
        const channels = registered.includes("PUSH")
            ? ["IN_APP", "PUSH"]
            : ["IN_APP"];
        await notification_1.notificationService.send({
            userId: alert.userId,
            type: "ALERT",
            template: "PRICE_ALERT",
            channels: [...channels],
            priority: "HIGH",
            data: {
                title: rendered.title,
                message,
                link: tradeLink(alert),
                relatedId: alert.id,
                pair: alert.symbol,
                price: (0, rules_1.formatAlertPrice)(current),
                change: (0, rules_1.describeChange)(previous, current),
            },
            idempotencyKey: `price-alert-${alert.id}-${firedAt}`,
        });
    }
    catch (error) {
        console_1.logger.error("CRON", `Price alert ${alert.id} fired but could not be delivered`, error);
    }
}
