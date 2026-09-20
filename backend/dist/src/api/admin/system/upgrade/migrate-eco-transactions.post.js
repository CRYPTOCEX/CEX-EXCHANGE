"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Migrate ECO Transaction Reference IDs",
    operationId: "migrateEcoTransactions",
    tags: ["Admin", "System", "Upgrade"],
    description: "Migrates ECO wallet transactions by moving referenceId values to trxId field and setting referenceId to null.",
    responses: {
        200: {
            description: "Migration completed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: {
                                type: "boolean",
                                description: "Whether the migration was successful"
                            },
                            updated: {
                                type: "number",
                                description: "Number of transactions updated"
                            },
                            message: {
                                type: "string",
                                description: "Migration result message"
                            }
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.system",
    logModule: "ADMIN_SYS",
    logTitle: "Migrate ECO transactions",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const userPk = await db_1.models.user.findByPk(user.id, {
        include: [{ model: db_1.models.role, as: "role" }],
    });
    if (!userPk || !userPk.role || userPk.role.name !== "Super Admin") {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Forbidden - Only Super Admins can run this migration",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding ECO transactions with referenceId");
        const onEcoWallet = {
            walletId: {
                [sequelize_1.Op.in]: (0, sequelize_1.literal)("(SELECT `id` FROM `wallet` WHERE `type` = 'ECO')"),
            },
            referenceId: {
                [sequelize_1.Op.ne]: null,
            },
        };
        const pendingCount = await db_1.models.transaction.count({
            where: onEcoWallet,
        });
        if (pendingCount === 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success("No ECO transactions to migrate (already migrated)");
            return {
                success: true,
                updated: 0,
                message: "No ECO transactions to migrate (already migrated)"
            };
        }
        const [updatedCount] = await db_1.models.transaction.update({
            trxId: (0, sequelize_1.col)('referenceId'),
            referenceId: null
        }, {
            where: onEcoWallet,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully migrated ${updatedCount} ECO transactions`);
        return {
            success: true,
            updated: updatedCount,
            message: `Successfully migrated ${updatedCount} ECO transactions`
        };
    }
    catch (error) {
        console_1.logger.error("SYSTEM", "Error migrating ECO transactions", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to migrate ECO transactions: ${error.message}`);
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to migrate ECO transactions" });
    }
};
