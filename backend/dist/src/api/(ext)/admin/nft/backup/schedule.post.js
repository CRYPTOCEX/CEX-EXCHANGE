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
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const backup_1 = require("@b/api/(ext)/nft/utils/backup");
const console_1 = require("@b/utils/console");
const query_1 = require("@b/utils/query");
const notification_1 = require("@b/services/notification");
exports.metadata = {
    summary: "Schedule automated NFT blockchain backups",
    description: "Creates or updates an automated backup schedule for NFT blockchain data",
    operationId: "scheduleNftBackups",
    tags: ["Admin", "NFT", "Backup"],
    logModule: "ADMIN_NFT",
    logTitle: "Schedule NFT backup",
    requiresAuth: true,
    permission: "manage.nft.backup",
    requestBody: {
        description: "Backup schedule configuration",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        chain: {
                            type: "string",
                            description: "Blockchain chain identifier",
                            enum: ["ETH", "BSC", "POLYGON"],
                        },
                        schedule: {
                            type: "string",
                            description: "Backup schedule frequency",
                            enum: ["HOURLY", "DAILY", "WEEKLY", "MONTHLY"],
                        },
                        backupType: {
                            type: "string",
                            description: "Type of backup",
                            enum: ["FULL", "INCREMENTAL"],
                        },
                        includeDisputes: {
                            type: "boolean",
                            description: "Include dispute data in backup",
                            default: false,
                        },
                        enabled: {
                            type: "boolean",
                            description: "Enable/disable the schedule",
                            default: true,
                        },
                        runImmediately: {
                            type: "boolean",
                            description: "Run backup immediately after scheduling",
                            default: false,
                        },
                    },
                    required: ["chain", "schedule", "backupType"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("NFT Backup Schedule"),
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating required fields");
        if (!body.chain || !body.schedule || !body.backupType) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required fields: chain, schedule, or backupType");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Missing required fields: chain, schedule, or backupType",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating chain");
        const validChains = ["ETH", "BSC", "POLYGON"];
        if (!validChains.includes(body.chain)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid chain: ${body.chain}`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid chain. Must be one of: ETH, BSC, POLYGON",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating schedule");
        const validSchedules = ["HOURLY", "DAILY", "WEEKLY", "MONTHLY"];
        if (!validSchedules.includes(body.schedule)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid schedule: ${body.schedule}`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid schedule. Must be one of: HOURLY, DAILY, WEEKLY, MONTHLY",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating backup type");
        if (!["FULL", "INCREMENTAL"].includes(body.backupType)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid backup type: ${body.backupType}`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid backup type. Must be FULL or INCREMENTAL",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating backup schedule");
        const scheduleConfig = await (0, backup_1.createNFTBackupSchedule)(body.chain, body.schedule, body.backupType, body.includeDisputes || false, body.enabled !== false);
        if (body.runImmediately) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Triggering immediate backup");
            const { getBlockchainBackupService } = await Promise.resolve().then(() => __importStar(require("../../../nft/utils/blockchain-backup-service")));
            setTimeout(async () => {
                try {
                    const backupService = await getBlockchainBackupService(body.chain);
                    if (body.backupType === "FULL") {
                        await backupService.createBackup(body.includeDisputes || false);
                    }
                    else {
                        await backupService.createIncrementalBackup();
                    }
                    console_1.logger.info("NFT", `Immediate backup completed for ${body.chain}`);
                }
                catch (error) {
                    console_1.logger.error("NFT", `Immediate backup failed for ${body.chain}`, error);
                }
            }, 1000);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating notification");
        await notification_1.notificationService.send({
            userId: user.id,
            type: "SYSTEM",
            channels: ["IN_APP"],
            idempotencyKey: `nft_backup_schedule_${body.chain}_${user.id}_${Date.now()}`,
            data: {
                title: "NFT Backup Scheduled",
                message: `Scheduled ${body.backupType} backup for ${body.chain} chain (${body.schedule})`,
            },
            priority: "NORMAL"
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Backup schedule for ${body.chain} ${body.enabled !== false ? "created" : "disabled"} successfully`);
        return {
            success: true,
            message: `Backup schedule ${body.enabled !== false ? "created" : "disabled"} successfully`,
            data: {
                chain: scheduleConfig.chain,
                schedule: scheduleConfig.schedule,
                backupType: scheduleConfig.backupType,
                includeDisputes: scheduleConfig.includeDisputes,
                enabled: scheduleConfig.enabled,
                nextRun: scheduleConfig.nextRun,
            },
        };
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to schedule NFT backup", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to schedule NFT backup");
        throw error;
    }
};
