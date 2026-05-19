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
        });
        (0, broadcast_1.broadcastLog)(cronName, `Found ${expiredBlocks.length} expired temporary blocks`);
        for (const block of expiredBlocks) {
            try {
                await block.update({ isActive: false });
                const otherActiveBlocks = await db_1.models.userBlock.findOne({
                    where: {
                        userId: block.userId,
                        isActive: true,
                        id: { [sequelize_1.Op.ne]: block.id },
                    },
                });
                if (!otherActiveBlocks && block.user) {
                    await block.user.update({ status: "ACTIVE" });
                    (0, broadcast_1.broadcastLog)(cronName, `Auto-unblocked user ${block.user.firstName} ${block.user.lastName} (${block.user.email})`, "success");
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
