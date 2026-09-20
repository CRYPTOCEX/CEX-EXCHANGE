"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processIcoOfferings = processIcoOfferings;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const broadcast_1 = require("@b/cron/broadcast");
async function processIcoOfferings() {
    const cronName = "processIcoOfferings";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting ICO offerings processing");
        const offerings = await db_1.models.icoTokenOffering.findAll({
            where: {
                status: { [sequelize_1.Op.in]: ["UPCOMING", "ACTIVE"] },
            },
        });
        (0, broadcast_1.broadcastLog)(cronName, `Found ${offerings.length} ICO offerings to evaluate`, "info");
        const currentDate = new Date();
        for (const offering of offerings) {
            try {
                if (offering.status === "UPCOMING" &&
                    offering.startDate &&
                    currentDate >= offering.startDate) {
                    await offering.update({ status: "ACTIVE" });
                    (0, broadcast_1.broadcastLog)(cronName, `Offering ${offering.id} changed from UPCOMING to ACTIVE`, "success");
                }
                else if (offering.status === "ACTIVE" &&
                    offering.endDate &&
                    currentDate >= offering.endDate) {
                    await offering.update({ status: "SUCCESS" });
                    (0, broadcast_1.broadcastLog)(cronName, `Offering ${offering.id} changed from ACTIVE to SUCCESS`, "success");
                }
                else {
                    (0, broadcast_1.broadcastLog)(cronName, `Offering ${offering.id} not eligible for update (status: ${offering.status}, startDate: ${offering.startDate}, endDate: ${offering.endDate})`, "info");
                }
            }
            catch (error) {
                console_1.logger.error("ICO_OFFERING_PROCESS", `Error updating offering ${offering.id}: ${error.message}`, error);
                (0, broadcast_1.broadcastLog)(cronName, `Error updating offering ${offering.id}: ${error.message}`, "error");
            }
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
        });
        (0, broadcast_1.broadcastLog)(cronName, "ICO offerings processing completed", "success");
    }
    catch (error) {
        console_1.logger.error("ICO_OFFERING_PROCESS", `ICO offerings processing failed: ${error.message}`, error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `ICO offerings processing failed: ${error.message}`, "error");
        throw error;
    }
}
