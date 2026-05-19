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
exports.initializeNFTBackupSchedules = initializeNFTBackupSchedules;
exports.stopNFTBackupSchedules = stopNFTBackupSchedules;
exports.createNFTBackupSchedule = createNFTBackupSchedule;
exports.deleteNFTBackupSchedule = deleteNFTBackupSchedule;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const broadcast_1 = require("@b/cron/broadcast");
const activeSchedules = new Map();
async function getBackupService(chain) {
    try {
        const backupModule = await Promise.resolve().then(() => __importStar(require("./blockchain-backup-service")));
        return await backupModule.getBlockchainBackupService(chain);
    }
    catch (error) {
        (0, broadcast_1.broadcastLog)("NFT Backup", `Backup service not available for chain: ${chain}`);
        return null;
    }
}
async function processNFTBackups() {
    var _a, _b, _c;
    try {
        (0, broadcast_1.broadcastStatus)("NFT Backup", "running", { message: "Processing scheduled NFT backups" });
        const schedules = await ((_a = db_1.models.settings) === null || _a === void 0 ? void 0 : _a.findAll({
            where: {
                key: {
                    [sequelize_1.Op.like]: 'nft_backup_schedule_%'
                }
            }
        }));
        if (!schedules || schedules.length === 0) {
            (0, broadcast_1.broadcastLog)("NFT Backup", "No backup schedules configured");
            return;
        }
        for (const schedule of schedules) {
            try {
                const scheduleValue = (_b = schedule.value) !== null && _b !== void 0 ? _b : "";
                const config = JSON.parse(scheduleValue);
                if (!config.enabled) {
                    continue;
                }
                const nextRun = config.nextRun ? new Date(config.nextRun) : null;
                const now = new Date();
                if (nextRun && now >= nextRun) {
                    (0, broadcast_1.broadcastLog)("NFT Backup", `Running backup for chain: ${config.chain}`);
                    const backupService = await getBackupService(config.chain);
                    if (!backupService) {
                        continue;
                    }
                    if (config.backupType === "FULL") {
                        await backupService.createBackup(config.includeDisputes);
                        (0, broadcast_1.broadcastLog)("NFT Backup", `Full backup completed for ${config.chain}`);
                    }
                    else {
                        await backupService.createIncrementalBackup();
                        (0, broadcast_1.broadcastLog)("NFT Backup", `Incremental backup completed for ${config.chain}`);
                    }
                    config.lastRun = now.toISOString();
                    config.nextRun = calculateNextRun(config.schedule, now).toISOString();
                    await ((_c = db_1.models.settings) === null || _c === void 0 ? void 0 : _c.update({ value: JSON.stringify(config) }, { where: { key: schedule.key } }));
                }
            }
            catch (error) {
                console_1.logger.error("NFT_BACKUP", "Error processing backup schedule", error);
                (0, broadcast_1.broadcastLog)("NFT Backup", `Error processing backup for schedule: ${error.message}`);
            }
        }
        (0, broadcast_1.broadcastStatus)("NFT Backup", "completed", { message: "All scheduled backups processed" });
    }
    catch (error) {
        console_1.logger.error("NFT_BACKUP", "Failed to process NFT backups", error);
        (0, broadcast_1.broadcastStatus)("NFT Backup", "failed", { error: error.message });
    }
}
async function initializeNFTBackupSchedules() {
    var _a, _b;
    try {
        const schedules = await ((_a = db_1.models.settings) === null || _a === void 0 ? void 0 : _a.findAll({
            where: {
                key: {
                    [sequelize_1.Op.like]: 'nft_backup_schedule_%'
                }
            }
        }));
        if (!schedules || schedules.length === 0) {
            return;
        }
        for (const schedule of schedules) {
            try {
                const scheduleValue = (_b = schedule.value) !== null && _b !== void 0 ? _b : "";
                const config = JSON.parse(scheduleValue);
                if (!config.enabled) {
                    continue;
                }
                const intervalMs = getIntervalFromSchedule(config.schedule);
                if (intervalMs > 0) {
                    const intervalId = setInterval(async () => {
                        try {
                            const backupService = await getBackupService(config.chain);
                            if (!backupService) {
                                return;
                            }
                            if (config.backupType === "FULL") {
                                await backupService.createBackup(config.includeDisputes);
                            }
                            else {
                                await backupService.createIncrementalBackup();
                            }
                            (0, broadcast_1.broadcastLog)("NFT Backup", `Backup completed for ${config.chain}`);
                        }
                        catch (error) {
                            console_1.logger.error("NFT_BACKUP", "Backup interval error", error);
                        }
                    }, intervalMs);
                    activeSchedules.set(`nft-backup-${config.chain}`, intervalId);
                    console_1.logger.info("NFT_BACKUP", `Initialized schedule for ${config.chain}: ${config.schedule}`);
                }
            }
            catch (error) {
                console_1.logger.error("NFT_BACKUP", "Failed to init backup schedule", error);
            }
        }
    }
    catch (error) {
        console_1.logger.error("NFT_BACKUP", "Failed to initialize backup schedules", error);
    }
}
function stopNFTBackupSchedules() {
    for (const [key, intervalId] of activeSchedules) {
        clearInterval(intervalId);
        activeSchedules.delete(key);
    }
    console_1.logger.info("NFT_BACKUP", "All backup schedules stopped");
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
function getIntervalFromSchedule(schedule) {
    switch (schedule) {
        case "HOURLY":
            return 60 * 60 * 1000;
        case "DAILY":
            return 24 * 60 * 60 * 1000;
        case "WEEKLY":
            return 7 * 24 * 60 * 60 * 1000;
        case "MONTHLY":
            return 30 * 24 * 60 * 60 * 1000;
        default:
            return 24 * 60 * 60 * 1000;
    }
}
async function createNFTBackupSchedule(chain, schedule, backupType, includeDisputes = false, enabled = true) {
    var _a;
    try {
        const key = `nft_backup_schedule_${chain}`;
        const existingId = activeSchedules.get(`nft-backup-${chain}`);
        if (existingId) {
            clearInterval(existingId);
            activeSchedules.delete(`nft-backup-${chain}`);
        }
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
        if (enabled) {
            const intervalMs = getIntervalFromSchedule(schedule);
            if (intervalMs > 0) {
                const intervalId = setInterval(async () => {
                    var _a;
                    try {
                        const backupService = await getBackupService(chain);
                        if (!backupService) {
                            return;
                        }
                        if (backupType === "FULL") {
                            await backupService.createBackup(includeDisputes);
                        }
                        else {
                            await backupService.createIncrementalBackup();
                        }
                        config.lastRun = new Date().toISOString();
                        config.nextRun = calculateNextRun(schedule).toISOString();
                        await ((_a = db_1.models.settings) === null || _a === void 0 ? void 0 : _a.update({ value: JSON.stringify(config) }, { where: { key } }));
                        (0, broadcast_1.broadcastLog)("NFT Backup", `Backup completed for ${chain}`);
                    }
                    catch (error) {
                        console_1.logger.error("NFT_BACKUP", "Backup schedule execution error", error);
                    }
                }, intervalMs);
                activeSchedules.set(`nft-backup-${chain}`, intervalId);
            }
        }
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
        const scheduleId = activeSchedules.get(`nft-backup-${chain}`);
        if (scheduleId) {
            clearInterval(scheduleId);
            activeSchedules.delete(`nft-backup-${chain}`);
        }
        await ((_a = db_1.models.settings) === null || _a === void 0 ? void 0 : _a.destroy({
            where: { key: `nft_backup_schedule_${chain}` }
        }));
        (0, broadcast_1.broadcastLog)("NFT Backup", `Backup schedule deleted for ${chain}`);
    }
    catch (error) {
        console_1.logger.error("NFT_BACKUP", "Failed to delete backup schedule", error);
        throw error;
    }
}
