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
exports.purgeGeoAccessLog = purgeGeoAccessLog;
const console_1 = require("@b/utils/console");
const broadcast_1 = require("../broadcast");
async function purgeGeoAccessLog() {
    const cronName = "purgeGeoAccessLog";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        const { getPolicy, purgeExpiredAuditRows, loadPolicy } = await Promise.resolve().then(() => __importStar(require("@b/utils/geo")));
        await loadPolicy();
        const policy = getPolicy();
        if (!policy.logRetentionDays) {
            (0, broadcast_1.broadcastLog)(cronName, "Retention is set to keep entries indefinitely — nothing to purge");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", {
                duration: Date.now() - startTime,
            });
            return;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Purging geo access log entries older than ${policy.logRetentionDays} days`);
        const deleted = await purgeExpiredAuditRows(policy);
        (0, broadcast_1.broadcastLog)(cronName, `Geo access log retention complete — ${deleted} entries removed`, "success");
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
        });
    }
    catch (error) {
        console_1.logger.error("CRON", "Geo access log retention failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `Geo access log retention failed: ${error.message}`, "error");
        throw error;
    }
}
