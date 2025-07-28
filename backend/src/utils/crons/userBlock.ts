import { models } from "@b/db";
import { logError } from "../logger";
import { broadcastStatus, broadcastLog } from "./broadcast";
import { Op } from "sequelize";

export async function processExpiredUserBlocks() {
  const cronName = "processExpiredUserBlocks";
  const startTime = Date.now();
  
  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting expired user blocks processing");

    // Find all users with temporary blocks that have expired
    const expiredBlocks = await models.userBlock.findAll({
      where: {
        isTemporary: true,
        isActive: true,
        blockedUntil: {
          [Op.lt]: new Date(),
        },
      },
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "status", "firstName", "lastName", "email"],
        },
      ],
    });

    broadcastLog(cronName, `Found ${expiredBlocks.length} expired temporary blocks`);

    for (const block of expiredBlocks) {
      try {
        // Update the block to inactive
        await block.update({ isActive: false });

        // Check if this user has any other active blocks
        const otherActiveBlocks = await models.userBlock.findOne({
          where: {
            userId: block.userId,
            isActive: true,
            id: { [Op.ne]: block.id },
          },
        });

        // If no other active blocks, reactivate the user
        if (!otherActiveBlocks && block.user) {
          await block.user.update({ status: "ACTIVE" });
          
          broadcastLog(
            cronName,
            `Auto-unblocked user ${block.user.firstName} ${block.user.lastName} (${block.user.email})`,
            "success"
          );
        }
      } catch (error: any) {
        logError(
          `processExpiredUserBlocks - block ${block.id}`,
          error,
          __filename
        );
        broadcastLog(
          cronName,
          `Error processing expired block ${block.id}: ${error.message}`,
          "error"
        );
      }
    }

    broadcastStatus(cronName, "completed", {
      duration: Date.now() - startTime,
    });
    broadcastLog(
      cronName,
      `Expired user blocks processing completed. Processed ${expiredBlocks.length} blocks`,
      "success"
    );
  } catch (error: any) {
    logError("processExpiredUserBlocks", error, __filename);
    broadcastStatus(cronName, "failed");
    broadcastLog(
      cronName,
      `Expired user blocks processing failed: ${error.message}`,
      "error"
    );
    throw error;
  }
} 