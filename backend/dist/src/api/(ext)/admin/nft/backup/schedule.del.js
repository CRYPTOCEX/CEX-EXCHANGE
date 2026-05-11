"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const backup_1 = require("@b/api/(ext)/nft/utils/backup");
const console_1 = require("@b/utils/console");
const query_1 = require("@b/utils/query");
const notification_1 = require("@b/services/notification");
exports.metadata = {
    summary: "Delete NFT backup schedule",
    description: "Deletes an existing NFT blockchain backup schedule",
    operationId: "deleteNftBackupSchedule",
    tags: ["Admin", "NFT", "Backup"],
    logModule: "ADMIN_NFT",
    logTitle: "Delete NFT backup schedule",
    requiresAuth: true,
    permission: "delete.nft.backup",
    requestBody: {
        description: "Chain identifier to delete schedule for",
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
                    },
                    required: ["chain"],
                },
            },
        },
    },
    responses: (0, query_1.deleteRecordResponses)("NFT Backup Schedule"),
};
exports.default = async (data) => {
    var _a;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating request");
        if (!(body === null || body === void 0 ? void 0 : body.chain)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Chain parameter is required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Chain is required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking if schedule exists");
        const schedule = await ((_a = db_1.models.settings) === null || _a === void 0 ? void 0 : _a.findOne({
            where: { key: `nft_backup_schedule_${body.chain}` }
        }));
        if (!schedule) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`No backup schedule found for chain: ${body.chain}`);
            throw (0, error_1.createError)({
                statusCode: 404,
                message: `No backup schedule found for chain: ${body.chain}`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting schedule");
        await (0, backup_1.deleteNFTBackupSchedule)(body.chain);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating notification");
        await notification_1.notificationService.send({
            userId: user.id,
            type: "SYSTEM",
            channels: ["IN_APP"],
            idempotencyKey: `nft_backup_delete_${body.chain}_${user.id}_${Date.now()}`,
            data: {
                title: "NFT Backup Schedule Deleted",
                message: `Deleted backup schedule for ${body.chain} chain`,
            },
            priority: "NORMAL"
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Backup schedule for ${body.chain} deleted successfully`);
        return {
            success: true,
            message: `Backup schedule for ${body.chain} deleted successfully`,
        };
    }
    catch (error) {
        console_1.logger.error("NFT_BACKUP", "Failed to delete NFT backup schedule", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to delete NFT backup schedule");
        throw error;
    }
};
