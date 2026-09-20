"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processExpiredUserBlocks = processExpiredUserBlocks;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const broadcast_1 = require("../broadcast");
const sequelize_1 = require("sequelize");
async function processExpiredUserBlocks() {
    const cronName = "processExpiredUserBlocks";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting expired user blocks processing");
        const BLOCK_BATCH_LIMIT = 500;
        const expiredBlocks = await db_1.models.userBlock.findAll({
            where: {
                isTemporary: true,
                isActive: true,
                blockedUntil: {
                    [sequelize_1.Op.lt]: new Date(),
                },
            },
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "status", "firstName", "lastName", "email"],
                },
            ],
            order: [["blockedUntil", "ASC"]],
            limit: BLOCK_BATCH_LIMIT,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Found ${expiredBlocks.length} expired temporary blocks`);
        for (const block of expiredBlocks) {
            try {
                let reactivated = false;
                await db_1.sequelize.transaction(async (transaction) => {
                    await block.update({ isActive: false }, { transaction });
                    const otherActiveBlocks = await db_1.models.userBlock.findOne({
                        where: {
                            userId: block.userId,
                            isActive: true,
                            id: { [sequelize_1.Op.ne]: block.id },
                        },
                        transaction,
                    });
                    if (!otherActiveBlocks && block.user) {
                        const [updatedCount] = await db_1.models.user.update({ status: "ACTIVE" }, {
                            where: { id: block.userId, status: "SUSPENDED" },
                            transaction,
                        });
                        reactivated = updatedCount > 0;
                    }
                });
                if (block.user) {
                    if (reactivated) {
                        (0, broadcast_1.broadcastLog)(cronName, `Auto-unblocked user ${block.user.firstName} ${block.user.lastName} (${block.user.email})`, "success");
                    }
                    else {
                        (0, broadcast_1.broadcastLog)(cronName, `Expired block ${block.id} deactivated for user ${block.user.email}; status left unchanged (other active blocks remain, or current status was not set by this temporary block)`);
                    }
                }
            }
            catch (error) {
                console_1.logger.error("CRON", `Error processing expired block ${block.id}`, error);
                (0, broadcast_1.broadcastLog)(cronName, `Error processing expired block ${block.id}: ${error.message}`, "error");
            }
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Expired user blocks processing completed. Processed ${expiredBlocks.length} blocks`, "success");
    }
    catch (error) {
        console_1.logger.error("CRON", "Expired user blocks processing failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `Expired user blocks processing failed: ${error.message}`, "error");
        throw error;
    }
}
