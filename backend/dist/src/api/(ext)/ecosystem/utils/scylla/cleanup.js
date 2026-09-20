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
exports.cleanupCorruptedOrders = cleanupCorruptedOrders;
exports.findProblematicOrders = findProblematicOrders;
exports.getOrderDataQualityStats = getOrderDataQualityStats;
const client_1 = __importStar(require("./client"));
const console_1 = require("@b/utils/console");
async function cleanupCorruptedOrders(dryRun = false, limit = 10000) {
    const stats = {
        totalScanned: 0,
        corruptedFound: 0,
        deleted: 0,
        errors: 0,
    };
    try {
        console_1.logger.info("CLEANUP", `Starting corrupted orders cleanup (dryRun: ${dryRun}, limit: ${limit})`);
        const query = `
      SELECT "userId", "createdAt", id, symbol, amount, price, cost, side, status
      FROM ${client_1.scyllaKeyspace}.orders
      LIMIT ?
      ALLOW FILTERING;
    `;
        const result = await client_1.default.execute(query, [limit], { prepare: true });
        stats.totalScanned = result.rows.length;
        console_1.logger.info("CLEANUP", `Scanned ${stats.totalScanned} orders`);
        const corruptedOrders = [];
        for (const row of result.rows) {
            const isCorrupted = row.symbol === null ||
                row.amount === null ||
                row.price === null ||
                row.cost === null ||
                row.side === null;
            if (isCorrupted) {
                stats.corruptedFound++;
                corruptedOrders.push({
                    userId: row.userId,
                    createdAt: row.createdAt,
                    id: row.id,
                });
                if (corruptedOrders.length % 100 === 0) {
                    console_1.logger.info("CLEANUP", `Found ${corruptedOrders.length} corrupted orders so far...`);
                }
            }
        }
        console_1.logger.info("CLEANUP", `Found ${stats.corruptedFound} corrupted orders out of ${stats.totalScanned} scanned`);
        if (dryRun) {
            console_1.logger.info("CLEANUP", "Dry run mode - no records will be deleted");
            return stats;
        }
        if (corruptedOrders.length > 0) {
            console_1.logger.info("CLEANUP", `Deleting ${corruptedOrders.length} corrupted orders...`);
            for (const order of corruptedOrders) {
                try {
                    const deleteQuery = `
            DELETE FROM ${client_1.scyllaKeyspace}.orders
            WHERE "userId" = ? AND "createdAt" = ? AND id = ?;
          `;
                    await client_1.default.execute(deleteQuery, [order.userId, order.createdAt, order.id], { prepare: true });
                    stats.deleted++;
                    if (stats.deleted % 100 === 0) {
                        console_1.logger.info("CLEANUP", `Deleted ${stats.deleted} / ${corruptedOrders.length} corrupted orders`);
                    }
                }
                catch (error) {
                    stats.errors++;
                    console_1.logger.error("CLEANUP", `Failed to delete order: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
        console_1.logger.info("CLEANUP", `Cleanup complete: scanned=${stats.totalScanned}, found=${stats.corruptedFound}, deleted=${stats.deleted}, errors=${stats.errors}`);
        return stats;
    }
    catch (error) {
        console_1.logger.error("CLEANUP", `Cleanup failed: ${error instanceof Error ? error.message : String(error)}`, error);
        throw error;
    }
}
async function findProblematicOrders(issueType, limit = 100) {
    var _a;
    try {
        if (issueType === 'null-fields') {
            const query = `
        SELECT "userId", "createdAt", id, symbol, amount, price, cost, side, status
        FROM ${client_1.scyllaKeyspace}.orders
        LIMIT ?
        ALLOW FILTERING;
      `;
            const result = await client_1.default.execute(query, [limit * 10], { prepare: true });
            return result.rows
                .filter(row => row.symbol === null ||
                row.amount === null ||
                row.price === null ||
                row.cost === null ||
                row.side === null)
                .slice(0, limit);
        }
        else {
            const query = `
        SELECT id
        FROM ${client_1.scyllaKeyspace}.orders
        LIMIT ?
        ALLOW FILTERING;
      `;
            const result = await client_1.default.execute(query, [limit * 10], { prepare: true });
            const idCounts = new Map();
            for (const row of result.rows) {
                const idStr = (_a = row.id) === null || _a === void 0 ? void 0 : _a.toString();
                if (idStr) {
                    idCounts.set(idStr, (idCounts.get(idStr) || 0) + 1);
                }
            }
            const duplicateIds = Array.from(idCounts.entries())
                .filter(([, count]) => count > 1)
                .map(([id]) => id)
                .slice(0, limit);
            const duplicateOrders = [];
            for (const id of duplicateIds) {
                const detailQuery = `
          SELECT *
          FROM ${client_1.scyllaKeyspace}.orders
          WHERE id = ?
          ALLOW FILTERING;
        `;
                const detailResult = await client_1.default.execute(detailQuery, [id], { prepare: true });
                duplicateOrders.push(...detailResult.rows);
            }
            return duplicateOrders;
        }
    }
    catch (error) {
        console_1.logger.error("CLEANUP", `Failed to find problematic orders: ${error instanceof Error ? error.message : String(error)}`, error);
        throw error;
    }
}
async function getOrderDataQualityStats() {
    var _a;
    try {
        const countQuery = `SELECT COUNT(*) as total FROM ${client_1.scyllaKeyspace}.orders;`;
        const countResult = await client_1.default.execute(countQuery);
        const totalOrders = Number(((_a = countResult.rows[0]) === null || _a === void 0 ? void 0 : _a.total) || 0);
        const sampleSize = Math.min(10000, totalOrders);
        const stats = await cleanupCorruptedOrders(true, sampleSize);
        const corruptionRate = totalOrders > 0 ? (stats.corruptedFound / stats.totalScanned) * 100 : 0;
        const estimatedCorrupted = Math.round((corruptionRate / 100) * totalOrders);
        return {
            totalOrders,
            corruptedOrders: estimatedCorrupted,
            corruptionRate: Number(corruptionRate.toFixed(2)),
        };
    }
    catch (error) {
        console_1.logger.error("CLEANUP", `Failed to get data quality stats: ${error instanceof Error ? error.message : String(error)}`, error);
        throw error;
    }
}
