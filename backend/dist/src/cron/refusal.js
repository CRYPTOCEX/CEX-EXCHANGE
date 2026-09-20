"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCronRefusal = getCronRefusal;
exports.cronRefusalTicks = cronRefusalTicks;
exports.clearCronRefusal = clearCronRefusal;
exports.cronAlertRecipientRoles = cronAlertRecipientRoles;
exports.announceCronRefusal = announceCronRefusal;
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const admin_alert_audience_1 = require("@b/utils/admin-alert-audience");
const broadcast_1 = require("./broadcast");
const refusals = new Map();
const refusalTicks = new Map();
function getCronRefusal(job) {
    var _a;
    return (_a = refusals.get(job)) !== null && _a !== void 0 ? _a : null;
}
function cronRefusalTicks(job) {
    var _a;
    return (_a = refusalTicks.get(job)) !== null && _a !== void 0 ? _a : 0;
}
function clearCronRefusal(job) {
    refusals.delete(job);
}
function recordCronRefusal(notice) {
    var _a;
    const kind = notice.degraded ? "degraded" : "refused";
    const now = new Date();
    const previous = refusals.get(notice.job);
    const continuing = previous && previous.reason === notice.reason && previous.kind === kind;
    refusals.set(notice.job, {
        kind,
        reason: notice.reason,
        impact: notice.impact,
        fix: notice.fix,
        since: continuing ? previous.since : now,
        lastSeen: now,
    });
    refusalTicks.set(notice.job, ((_a = refusalTicks.get(notice.job)) !== null && _a !== void 0 ? _a : 0) + 1);
}
const REFUSAL_ANNOUNCE_INTERVAL_MS = 15 * 60000;
const lastAnnouncedAt = new Map();
function cronAlertRecipientRoles() {
    return (0, admin_alert_audience_1.adminAlertRecipientRoles)();
}
async function announceCronRefusal(notice) {
    var _a;
    recordCronRefusal(notice);
    const now = Date.now();
    const last = (_a = lastAnnouncedAt.get(notice.job)) !== null && _a !== void 0 ? _a : 0;
    if (now - last < REFUSAL_ANNOUNCE_INTERVAL_MS)
        return;
    lastAnnouncedAt.set(notice.job, now);
    const title = `Cron job "${notice.job}" is NOT running on the scheduler process`;
    const body = `${notice.job} refused: ${notice.reason} ` +
        `NOT HAPPENING: ${notice.impact} ` +
        `FIX: ${notice.fix}`;
    console_1.logger.error("CRON", body);
    (0, broadcast_1.broadcastCriticalLog)(notice.job, body, "error");
    void (async () => {
        try {
            if (notice.alert) {
                await notice.alert();
                return;
            }
            await notifyAdmins(notice, title, body, now);
        }
        catch (error) {
            console_1.logger.error("CRON", `Could not deliver the refusal alert for ${notice.job}; the refusal stands and is logged above.`, error);
        }
    })();
}
async function notifyAdmins(notice, title, body, now) {
    const { models } = await Promise.resolve().then(() => __importStar(require("@b/db")));
    const roleNames = cronAlertRecipientRoles();
    const admins = await models.user.findAll({
        include: [
            {
                model: models.role,
                as: "role",
                where: { name: { [sequelize_1.Op.in]: roleNames } },
            },
        ],
        attributes: ["id"],
    });
    if (!admins.length) {
        console_1.logger.error("CRON", `No ${roleNames.join(" / ")} user exists to alert about ${notice.job} being refused — ` +
            "the refusal is in the process log only.");
        return;
    }
    const { notificationService } = await Promise.resolve().then(() => __importStar(require("@b/services/notification")));
    const windowKey = Math.floor(now / REFUSAL_ANNOUNCE_INTERVAL_MS);
    for (const admin of admins) {
        try {
            await notificationService.send({
                userId: admin.id,
                type: "ALERT",
                channels: ["IN_APP", "EMAIL"],
                idempotencyKey: `cron-refused-${notice.job}-${windowKey}-${admin.id}`,
                data: {
                    title,
                    message: body,
                    link: "/admin/system/cron",
                },
                priority: "URGENT",
            });
        }
        catch (error) {
            console_1.logger.error("CRON", `Refusal alert for ${notice.job} could not be delivered to admin ${admin.id}`, error);
        }
    }
}
