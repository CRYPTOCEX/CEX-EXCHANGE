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
                    (0, broadcast_1.broadcastLog)(cronName, `Offering ${offering.id} has ended - status will be determined by checkAndUpdateOfferingStatus`, "info");
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
        try {
            const { checkAndUpdateOfferingStatus } = await Promise.resolve().then(() => __importStar(require("./phaseManager")));
            await checkAndUpdateOfferingStatus();
        }
        catch (phaseError) {
            console_1.logger.error("ICO_OFFERING_PROCESS", `Phase manager update failed: ${phaseError.message}`, phaseError);
            (0, broadcast_1.broadcastLog)(cronName, `Phase manager update failed: ${phaseError.message}`, "error");
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
