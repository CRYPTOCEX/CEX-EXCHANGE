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
exports.processNFTBackups = processNFTBackups;
exports.createNFTBackupSchedule = createNFTBackupSchedule;
exports.deleteNFTBackupSchedule = deleteNFTBackupSchedule;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const broadcast_1 = require("@b/cron/broadcast");
const cronName = "processNFTBackups";
async function getBackupService(chain) {
    try {
        const backupModule = await Promise.resolve().then(() => __importStar(require("./blockchain-backup-service")));
        return await backupModule.getBlockchainBackupService(chain);
    }
    catch (error) {
        (0, broadcast_1.broadcastLog)(cronName, `Backup service not available for chain: ${chain}`);
        return null;
    }
}
async function processNFTBackups() {
    var _a, _b;
    var _c;
    let attempted = 0;
    let succeeded = 0;
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running", { message: "Processing scheduled NFT backups" });
        const schedules = await ((_a = db_1.models.settings) === null || _a === void 0 ? void 0 : _a.findAll({
            where: {
                key: {
                    [sequelize_1.Op.like]: 'nft_backup_schedule_%'
                }
            }
        }));
        if (!schedules || schedules.length === 0) {
            (0, broadcast_1.broadcastLog)(cronName, "No backup schedules configured");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { message: "No backup schedules configured" });
            return;
        }
        for (const schedule of schedules) {
            try {
                const scheduleValue = (_c = schedule.value) !== null && _c !== void 0 ? _c : "";
                const config = JSON.parse(scheduleValue);
                if (!config.enabled) {
                    continue;
                }
                const nextRun = config.nextRun ? new Date(config.nextRun) : null;
                const now = new Date();
                if (nextRun && now >= nextRun) {
                    (0, broadcast_1.broadcastLog)(cronName, `Running backup for chain: ${config.chain}`);
                    const backupService = await getBackupService(config.chain);
                    if (!backupService) {
                        continue;
                    }
                    attempted++;
                    if (config.backupType === "FULL") {
                        await backupService.createBackup(config.includeDisputes);
                        (0, broadcast_1.broadcastLog)(cronName, `Full backup completed for ${config.chain}`, "success");
                    }
                    else {
                        await backupService.createIncrementalBackup();
                        (0, broadcast_1.broadcastLog)(cronName, `Incremental backup completed for ${config.chain}`, "success");
                    }
                    succeeded++;
                    config.lastRun = now.toISOString();
                    config.nextRun = calculateNextRun(config.schedule, now).toISOString();
                    await ((_b = db_1.models.settings) === null || _b === void 0 ? void 0 : _b.update({ value: JSON.stringify(config) }, { where: { key: schedule.key } }));
                }
            }
            catch (error) {
                console_1.logger.error("NFT_BACKUP", "Error processing backup schedule", error);
                (0, broadcast_1.broadcastLog)(cronName, `Error processing backup for schedule: ${error.message}`, "error");
            }
        }
        if (attempted > 0 && succeeded === 0) {
            throw new Error(`All ${attempted} due backup schedule(s) failed`);
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            message: "All scheduled backups processed",
            attempted,
            succeeded,
        });
    }
    catch (error) {
        console_1.logger.error("NFT_BACKUP", "Failed to process NFT backups", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed", { error: error.message });
        throw error;
    }
}
function calculateNextRun(schedule, fromDate = new Date()) {
    const nextRun = new Date(fromDate);
    switch (schedule) {
        case "HOURLY":
            nextRun.setHours(nextRun.getHours() + 1);
            break;
        case "DAILY":
            nextRun.setDate(nextRun.getDate() + 1);
            break;
        case "WEEKLY":
            nextRun.setDate(nextRun.getDate() + 7);
            break;
        case "MONTHLY":
            nextRun.setMonth(nextRun.getMonth() + 1);
            break;
        default:
            nextRun.setDate(nextRun.getDate() + 1);
    }
    return nextRun;
}
async function createNFTBackupSchedule(chain, schedule, backupType, includeDisputes = false, enabled = true) {
    var _a;
    try {
        const key = `nft_backup_schedule_${chain}`;
        const config = {
            chain,
            schedule,
            backupType,
            includeDisputes,
            enabled,
            lastRun: null,
            nextRun: calculateNextRun(schedule).toISOString(),
            createdAt: new Date().toISOString()
        };
        await ((_a = db_1.models.settings) === null || _a === void 0 ? void 0 : _a.upsert({
            key,
            value: JSON.stringify(config)
        }));
        return config;
    }
    catch (error) {
        console_1.logger.error("NFT_BACKUP", "Failed to create backup schedule", error);
        throw error;
    }
}
async function deleteNFTBackupSchedule(chain) {
    var _a;
    try {
        await ((_a = db_1.models.settings) === null || _a === void 0 ? void 0 : _a.destroy({
            where: { key: `nft_backup_schedule_${chain}` }
        }));
        (0, broadcast_1.broadcastLog)(cronName, `Backup schedule deleted for ${chain}`);
    }
    catch (error) {
        console_1.logger.error("NFT_BACKUP", "Failed to delete backup schedule", error);
        throw error;
    }
}
