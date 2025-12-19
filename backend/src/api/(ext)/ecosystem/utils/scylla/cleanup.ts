import client, { scyllaKeyspace } from "./client";
import { logger } from "@b/utils/console";

/**
 * Cleanup utility for removing corrupted order records from ScyllaDB
 *
 * Corrupted records are orders with null essential fields that were created
 * due to ScyllaDB's upsert behavior when UPDATE queries were called with
 * non-existent primary key combinations.
 */

export interface CleanupStats {
  totalScanned: number;
  corruptedFound: number;
  deleted: number;
  errors: number;
}

/**
 * Find and delete corrupted orders with null essential fields
 *
 * @param dryRun - If true, only count corrupted orders without deleting
 * @param limit - Maximum number of orders to scan (default: 10000)
 * @returns Statistics about the cleanup operation
 */
export async function cleanupCorruptedOrders(
  dryRun: boolean = false,
  limit: number = 10000
): Promise<CleanupStats> {
  const stats: CleanupStats = {
    totalScanned: 0,
    corruptedFound: 0,
    deleted: 0,
    errors: 0,
  };

  try {
    logger.info("CLEANUP", `Starting corrupted orders cleanup (dryRun: ${dryRun}, limit: ${limit})`);

    // Query all orders (we need ALLOW FILTERING since we're scanning without partition key restriction)
    // Note: This is expensive and should be run during low-traffic periods
    const query = `
      SELECT "userId", "createdAt", id, symbol, amount, price, cost, side, status
      FROM ${scyllaKeyspace}.orders
      LIMIT ?
      ALLOW FILTERING;
    `;

    const result = await client.execute(query, [limit], { prepare: true });
    stats.totalScanned = result.rows.length;

    logger.info("CLEANUP", `Scanned ${stats.totalScanned} orders`);

    const corruptedOrders: Array<{
      userId: any;
      createdAt: Date;
      id: any;
    }> = [];

    for (const row of result.rows) {
      // Check if essential fields are null
      const isCorrupted =
        row.symbol === null ||
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
          logger.info("CLEANUP", `Found ${corruptedOrders.length} corrupted orders so far...`);
        }
      }
    }

    logger.info("CLEANUP", `Found ${stats.corruptedFound} corrupted orders out of ${stats.totalScanned} scanned`);

    if (dryRun) {
      logger.info("CLEANUP", "Dry run mode - no records will be deleted");
      return stats;
    }

    // Delete corrupted orders
    if (corruptedOrders.length > 0) {
      logger.info("CLEANUP", `Deleting ${corruptedOrders.length} corrupted orders...`);

      for (const order of corruptedOrders) {
        try {
          const deleteQuery = `
            DELETE FROM ${scyllaKeyspace}.orders
            WHERE "userId" = ? AND "createdAt" = ? AND id = ?;
          `;

          await client.execute(
            deleteQuery,
            [order.userId, order.createdAt, order.id],
            { prepare: true }
          );

          stats.deleted++;

          if (stats.deleted % 100 === 0) {
            logger.info("CLEANUP", `Deleted ${stats.deleted} / ${corruptedOrders.length} corrupted orders`);
          }
        } catch (error) {
          stats.errors++;
          logger.error("CLEANUP", `Failed to delete order: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    logger.info("CLEANUP", `Cleanup complete: scanned=${stats.totalScanned}, found=${stats.corruptedFound}, deleted=${stats.deleted}, errors=${stats.errors}`);

    return stats;
  } catch (error) {
    logger.error("CLEANUP", `Cleanup failed: ${error instanceof Error ? error.message : String(error)}`, error);
    throw error;
  }
}

/**
 * Find orders with specific issues for diagnostic purposes
 *
 * @param issueType - Type of issue to find: 'null-fields' | 'duplicate-ids'
 * @param limit - Maximum number of results
 * @returns Array of problematic orders
 */
export async function findProblematicOrders(
  issueType: 'null-fields' | 'duplicate-ids',
  limit: number = 100
): Promise<any[]> {
  try {
    if (issueType === 'null-fields') {
      // Find orders with null essential fields
      const query = `
        SELECT "userId", "createdAt", id, symbol, amount, price, cost, side, status
        FROM ${scyllaKeyspace}.orders
        LIMIT ?
        ALLOW FILTERING;
      `;

      const result = await client.execute(query, [limit * 10], { prepare: true });

      return result.rows
        .filter(row =>
          row.symbol === null ||
          row.amount === null ||
          row.price === null ||
          row.cost === null ||
          row.side === null
        )
        .slice(0, limit);
    } else {
      // Find duplicate order IDs (same id, different userId)
      const query = `
        SELECT id
        FROM ${scyllaKeyspace}.orders
        LIMIT ?
        ALLOW FILTERING;
      `;

      const result = await client.execute(query, [limit * 10], { prepare: true });
      const idCounts = new Map<string, number>();

      for (const row of result.rows) {
        const idStr = row.id?.toString();
        if (idStr) {
          idCounts.set(idStr, (idCounts.get(idStr) || 0) + 1);
        }
      }

      // Find IDs that appear more than once
      const duplicateIds = Array.from(idCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([id]) => id)
        .slice(0, limit);

      // Get full order details for duplicate IDs
      const duplicateOrders: any[] = [];
      for (const id of duplicateIds) {
        const detailQuery = `
          SELECT *
          FROM ${scyllaKeyspace}.orders
          WHERE id = ?
          ALLOW FILTERING;
        `;
        const detailResult = await client.execute(detailQuery, [id], { prepare: true });
        duplicateOrders.push(...detailResult.rows);
      }

      return duplicateOrders;
    }
  } catch (error) {
    logger.error("CLEANUP", `Failed to find problematic orders: ${error instanceof Error ? error.message : String(error)}`, error);
    throw error;
  }
}

/**
 * Get statistics about order data quality
 *
 * @returns Object with data quality metrics
 */
export async function getOrderDataQualityStats(): Promise<{
  totalOrders: number;
  corruptedOrders: number;
  corruptionRate: number;
}> {
  try {
    // Count total orders
    const countQuery = `SELECT COUNT(*) as total FROM ${scyllaKeyspace}.orders;`;
    const countResult = await client.execute(countQuery);
    const totalOrders = Number(countResult.rows[0]?.total || 0);

    // Sample orders to estimate corruption rate
    const sampleSize = Math.min(10000, totalOrders);
    const stats = await cleanupCorruptedOrders(true, sampleSize);

    const corruptionRate = totalOrders > 0 ? (stats.corruptedFound / stats.totalScanned) * 100 : 0;
    const estimatedCorrupted = Math.round((corruptionRate / 100) * totalOrders);

    return {
      totalOrders,
      corruptedOrders: estimatedCorrupted,
      corruptionRate: Number(corruptionRate.toFixed(2)),
    };
  } catch (error) {
    logger.error("CLEANUP", `Failed to get data quality stats: ${error instanceof Error ? error.message : String(error)}`, error);
    throw error;
  }
}
