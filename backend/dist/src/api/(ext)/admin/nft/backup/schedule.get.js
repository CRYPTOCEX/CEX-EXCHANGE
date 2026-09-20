"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get NFT backup schedules",
    description: "Retrieves all configured NFT blockchain backup schedules",
    operationId: "getNftBackupSchedules",
    tags: ["Admin", "NFT", "Backup"],
    requiresAuth: true,
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Backup Schedule",
    permission: "view.nft.backup",
    parameters: [
        {
            name: "chain",
            in: "query",
            description: "Filter by blockchain chain",
            required: false,
            schema: {
                type: "string",
                enum: ["ETH", "BSC", "POLYGON"],
            },
        },
    ],
    responses: {
        200: {
            description: "NFT Backup Schedules retrieved successfully",
        },
        401: errors_1.unauthorizedResponse,
        403: errors_1.forbiddenResponse,
        500: errors_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a;
    const { user, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Process request");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        const where = {
            key: {
                [sequelize_1.Op.like]: 'nft_backup_schedule_%'
            }
        };
        if (query === null || query === void 0 ? void 0 : query.chain) {
            where.key = `nft_backup_schedule_${query.chain}`;
        }
        const schedules = await ((_a = db_1.models.settings) === null || _a === void 0 ? void 0 : _a.findAll({ where }));
        if (!schedules || schedules.length === 0) {
            return {
                success: true,
                data: [],
            };
        }
        const formattedSchedules = schedules.map(schedule => {
            var _a;
            try {
                const config = JSON.parse((_a = schedule.value) !== null && _a !== void 0 ? _a : '{}');
                return config;
            }
            catch (error) {
                console_1.logger.error("PARSE_BACKUP_SCHEDULE", "Failed to parse backup schedule", error);
                return null;
            }
        }).filter(Boolean);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get NFT Backup Schedule retrieved successfully");
        return {
            success: true,
            data: formattedSchedules,
        };
    }
    catch (error) {
        console_1.logger.error("GET_NFT_BACKUP_SCHEDULES", "Failed to get NFT backup schedules", error);
        throw error;
    }
};
