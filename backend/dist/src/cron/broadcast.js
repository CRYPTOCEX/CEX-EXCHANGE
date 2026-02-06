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
exports.broadcastStatus = broadcastStatus;
exports.broadcastProgress = broadcastProgress;
exports.broadcastLog = broadcastLog;
const Websocket_1 = require("@b/handler/Websocket");
const console_1 = require("@b/utils/console");
let CronJobManager = null;
async function getCronJobManager() {
    if (!CronJobManager) {
        const module = await Promise.resolve().then(() => __importStar(require("./index")));
        CronJobManager = module.default;
    }
    return CronJobManager;
}
async function broadcastStatus(cronName, status, extra = {}) {
    try {
        const Manager = await getCronJobManager();
        const cronJobManager = await Manager.getInstance();
        cronJobManager.updateJobRunningStatus(cronName, status);
    }
    catch (error) {
        console_1.logger.error("CRON", `Failed to update cron status for ${cronName}`, error);
    }
    Websocket_1.messageBroker.broadcastToRoute("/api/admin/system/cron", {
        type: "status",
        cronName,
        data: { status, ...extra },
        timestamp: new Date(),
    });
}
async function broadcastProgress(cronName, progress) {
    try {
        const Manager = await getCronJobManager();
        const cronJobManager = await Manager.getInstance();
        cronJobManager.updateJobRunningStatus(cronName, "running", progress);
    }
    catch (error) {
        console_1.logger.error("CRON", `Failed to update cron progress for ${cronName}`, error);
    }
    Websocket_1.messageBroker.broadcastToRoute("/api/admin/system/cron", {
        type: "progress",
        cronName,
        data: { progress },
        timestamp: new Date(),
    });
}
function broadcastLog(cronName, logMessage, logType = "info") {
    Websocket_1.messageBroker.broadcastToRoute("/api/admin/system/cron", {
        type: "log",
        cronName,
        data: { message: logMessage, logType },
        timestamp: new Date(),
    });
}
