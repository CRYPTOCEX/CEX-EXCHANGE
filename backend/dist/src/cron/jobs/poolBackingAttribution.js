"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poolBackingAttribute = poolBackingAttribute;
const console_1 = require("@b/utils/console");
const broadcast_1 = require("../broadcast");
const attribution_1 = require("@b/utils/pool-backing/attribution");
const venue_fees_1 = require("@b/utils/pool-backing/venue-fees");
async function poolBackingAttribute() {
    const cronName = "poolBackingAttribute";
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting pool-backing attribution");
        const summary = await (0, attribution_1.attributeDays)();
        if (summary.skipped) {
            (0, broadcast_1.broadcastLog)(cronName, `Skipped: ${summary.skipped}`, "info");
        }
        else {
            const first = summary.days[0];
            const last = summary.days[summary.days.length - 1];
            (0, broadcast_1.broadcastLog)(cronName, `${summary.days.length} day(s) attributed (${first === last ? first : `${first}..${last}`}); ${summary.written} minted row(s) written, ${summary.alreadyPresent} already present, ${summary.withinTolerance} within tolerance`, summary.unknown.length ? "warning" : "success");
            for (const u of summary.unknown) {
                (0, broadcast_1.broadcastLog)(cronName, `Unknown SPOT writer on ${u.day} for ${u.currency}: ${u.operations.join(", ")} (${u.rows} row(s), net ${u.amount}). Add the operation to a family in utils/pool-backing/attribution.ts.`, "warning");
            }
        }
        try {
            const fees = await (0, venue_fees_1.attributeVenueFees)();
            if (fees.skipped) {
                (0, broadcast_1.broadcastLog)(cronName, `Venue fees skipped: ${fees.skipped}`, "info");
            }
            else {
                (0, broadcast_1.broadcastLog)(cronName, `Venue fees on ${fees.provider}: ${fees.trades} trade(s) over ${fees.symbols.length} symbol(s) since ${fees.since}; ${fees.written} exchange_fee row(s) written (${fees.settled} settled, ${fees.partial} partly covered, ${fees.unfunded} unfunded), ${fees.alreadyPresent} already present${fees.failed.length ? `; ${fees.failed.length} failure(s), marker not advanced` : `; attributed through ${fees.through}`}`, fees.failed.length ? "warning" : "success");
                for (const f of fees.failed)
                    (0, broadcast_1.broadcastLog)(cronName, `Venue fees: ${f.reason}`, "warning");
                if (fees.orphanTrades) {
                    (0, broadcast_1.broadcastLog)(cronName, `Venue fees: ${fees.orphanTrades} trade(s) on ${fees.provider} belong to no platform order and were not written (${fees.orphanTradeIds.join(", ")}${fees.orphanTrades > fees.orphanTradeIds.length ? ", …" : ""}). An operator's own trade or a conversion leg books its own fee.`, "info");
                }
            }
        }
        catch (error) {
            console_1.logger.warn("CRON", `Pool-backing venue fees failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
            (0, broadcast_1.broadcastLog)(cronName, `Venue fees failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`, "warning");
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed");
    }
    catch (error) {
        console_1.logger.error("CRON", "Pool-backing attribution failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `Pool-backing attribution failed: ${error.message}`, "error");
        throw error;
    }
}
