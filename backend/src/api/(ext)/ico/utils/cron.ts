import { models } from "@b/db";
import { Op } from "sequelize";
import { logger } from "@b/utils/console";
import { broadcastStatus, broadcastLog } from "@b/cron/broadcast";

export async function processIcoOfferings() {
  const cronName = "processIcoOfferings";
  const startTime = Date.now();
  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting ICO offerings processing");

    // Fetch ICO offerings that are either UPCOMING or ACTIVE.
    // We only want to check offerings that might need a status change.
    const offerings = await models.icoTokenOffering.findAll({
      where: {
        status: { [Op.in]: ["UPCOMING", "ACTIVE"] },
      },
    });

    broadcastLog(
      cronName,
      `Found ${offerings.length} ICO offerings to evaluate`,
      "info"
    );
    const currentDate = new Date();

    for (const offering of offerings) {
      try {
        // If offering is UPCOMING and the startDate has passed, change to ACTIVE.
        if (
          offering.status === "UPCOMING" &&
          offering.startDate &&
          currentDate >= offering.startDate
        ) {
          await offering.update({ status: "ACTIVE" });
          broadcastLog(
            cronName,
            `Offering ${offering.id} changed from UPCOMING to ACTIVE`,
            "success"
          );
        }
        // If offering is ACTIVE and the endDate has passed, change to SUCCESS.
        else if (
          offering.status === "ACTIVE" &&
          offering.endDate &&
          currentDate >= offering.endDate
        ) {
          await offering.update({ status: "SUCCESS" });
          broadcastLog(
            cronName,
            `Offering ${offering.id} changed from ACTIVE to SUCCESS`,
            "success"
          );
        } else {
          broadcastLog(
            cronName,
            `Offering ${offering.id} not eligible for update (status: ${offering.status}, startDate: ${offering.startDate}, endDate: ${offering.endDate})`,
            "info"
          );
        }
      } catch (error: any) {
        logger.error(
          "ICO_OFFERING_PROCESS",
          `Error updating offering ${offering.id}: ${error.message}`,
          error
        );
        broadcastLog(
          cronName,
          `Error updating offering ${offering.id}: ${error.message}`,
          "error"
        );
      }
    }

    broadcastStatus(cronName, "completed", {
      duration: Date.now() - startTime,
    });
    broadcastLog(cronName, "ICO offerings processing completed", "success");
  } catch (error: any) {
    logger.error("ICO_OFFERING_PROCESS", `ICO offerings processing failed: ${error.message}`, error);
    broadcastStatus(cronName, "failed");
    broadcastLog(
      cronName,
      `ICO offerings processing failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}
