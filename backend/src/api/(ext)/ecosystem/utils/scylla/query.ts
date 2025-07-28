import client from "./client";
import { logError } from "@b/utils/logger";
import { fromBigInt } from "../blockchain"; // adjust path as needed
import { types } from "cassandra-driver";

// Supported operators for basic comparisons.
const operatorMap: Record<string, string> = {
  equal: "=",
  greaterThan: ">",
  greaterThanOrEqual: ">=",
  lessThan: "<",
  lessThanOrEqual: "<=",
  like: "LIKE", // for string columns only
  notLike: "NOT LIKE",
};

/**
 * Helper to quote a column name if it contains uppercase letters.
 */
function quoteColumn(key: string): string {
  return /[A-Z]/.test(key) ? `"${key}"` : key;
}

/**
 * Helper to format a 32-character hex string into standard UUID format: 8-4-4-4-12.
 */
function formatUuid(hexStr: string): string {
  return (
    hexStr.substr(0, 8) +
    "-" +
    hexStr.substr(8, 4) +
    "-" +
    hexStr.substr(12, 4) +
    "-" +
    hexStr.substr(16, 4) +
    "-" +
    hexStr.substr(20, 12)
  );
}

/**
 * Builds a WHERE clause from a filter object.
 *
 * @param filter - The filter object.
 * @param nonStringLikeColumns - An array of columns (e.g. UUID columns) that should not use plain LIKE.
 *
 * For non-string columns:
 * - "startsWith" or "like": If the value is shorter than a full UUID, a range query is generated.
 * - Unsupported operators ("notEqual", "endsWith", "substring", "regexp", "notRegexp") throw an error.
 */
function buildWhereClause(
  filter: any,
  nonStringLikeColumns: string[] = []
): { whereClause: string; values: any[] } {
  if (typeof filter === "string") {
    try {
      filter = JSON.parse(decodeURIComponent(filter));
    } catch (e) {
      filter = {};
    }
  }
  if (!filter || typeof filter !== "object") {
    return { whereClause: "", values: [] };
  }
  const clauses: string[] = [];
  const values: any[] = [];
  for (const key in filter) {
    if (Object.prototype.hasOwnProperty.call(filter, key)) {
      const columnName = quoteColumn(key);
      const condition = filter[key];
      if (
        typeof condition === "object" &&
        condition.operator &&
        condition.value !== undefined
      ) {
        // Handle "startsWith" / "like" operators.
        if (
          condition.operator === "startsWith" ||
          condition.operator === "like"
        ) {
          if (nonStringLikeColumns.includes(key)) {
            // For non-string columns (e.g. UUID), simulate "startsWith" with a range query.
            const prefix = condition.value.toString();
            if (prefix.length < 36) {
              const clean = prefix.replace(/-/g, "");
              const lowerClean = clean.padEnd(32, "0");
              const upperClean = clean.padEnd(32, "f");
              const lowerStr = formatUuid(lowerClean);
              const upperStr = formatUuid(upperClean);
              try {
                const lowerBound = types.Uuid.fromString(lowerStr);
                const upperBound = types.Uuid.fromString(upperStr);
                clauses.push(`${columnName} >= ?`);
                values.push(lowerBound);
                clauses.push(`${columnName} <= ?`);
                values.push(upperBound);
              } catch (e) {
                clauses.push(`${columnName} = ?`);
                values.push(
                  types.Uuid.fromString("00000000-0000-0000-0000-000000000000")
                );
              }
            } else {
              try {
                const uuidVal = types.Uuid.fromString(condition.value);
                clauses.push(`${columnName} = ?`);
                values.push(uuidVal);
              } catch (e) {
                clauses.push(`${columnName} = ?`);
                values.push(
                  types.Uuid.fromString("00000000-0000-0000-0000-000000000000")
                );
              }
            }
            continue;
          } else {
            clauses.push(`${columnName} LIKE ?`);
            values.push(`${condition.value}%`);
            continue;
          }
        }
        // For non-string columns, reject unsupported operators.
        if (nonStringLikeColumns.includes(key)) {
          const unsupported = [
            "notEqual",
            "endsWith",
            "substring",
            "regexp",
            "notRegexp",
          ];
          if (unsupported.includes(condition.operator)) {
            throw new Error(
              `Operator "${condition.operator}" is not supported for column "${key}" of non-string type`
            );
          }
        }
        const op = operatorMap[condition.operator];
        if (!op) continue;
        clauses.push(`${columnName} ${op} ?`);
        values.push(condition.value);
      } else {
        clauses.push(`${columnName} = ?`);
        values.push(condition);
      }
    }
  }
  return { whereClause: clauses.join(" AND "), values };
}

/**
 * Fetch records from a given table with filtering, sorting, and count-based pagination.
 *
 * If Cassandra cannot perform ORDER BY server-side (because partition keys aren’t restricted
 * or because the sort field isn’t a clustering column), an in-memory sort is applied.
 *
 * @param table - Table name.
 * @param query - Query object (may contain page, perPage, etc.).
 * @param filter - Filter conditions.
 * @param sortField - Field to sort on.
 * @param sortOrder - 'ASC' or 'DESC' (default: DESC).
 * @param perPage - Number of records per page.
 * @param allowFiltering - Whether to add ALLOW FILTERING.
 * @param keyspace - Optional keyspace.
 * @param partitionKeys - Array of partition key names (used for determining ORDER BY eligibility).
 * @param transformColumns - Array of columns to transform from BigInt.
 * @param nonStringLikeColumns - Array of columns (e.g. ["userId"]) to treat as non-string for LIKE operators.
 *
 * @returns An object with the transformed items and a pagination object.
 */
export async function getFiltered({
  table,
  query,
  filter,
  sortField = "createdAt",
  sortOrder = "DESC",
  perPage = 10,
  allowFiltering = true,
  keyspace,
  partitionKeys,
  transformColumns,
  nonStringLikeColumns = [],
}: {
  table: string;
  query: any;
  filter?: any;
  sortField?: string;
  sortOrder?: string;
  perPage?: number;
  allowFiltering?: boolean;
  keyspace?: string;
  partitionKeys?: string[];
  transformColumns?: string[];
  nonStringLikeColumns?: string[];
}): Promise<{
  items: any[];
  pagination: {
    totalItems: number;
    currentPage: number;
    perPage: number;
    totalPages: number;
  };
}> {
  const fullTableName = keyspace ? `${keyspace}.${table}` : table;
  const { whereClause, values } = buildWhereClause(
    filter,
    nonStringLikeColumns
  );
  const params = [...values];

  // Build count query.
  let countCql = `SELECT count(*) FROM ${fullTableName}`;
  if (whereClause) {
    countCql += ` WHERE ${whereClause}`;
  }
  if (allowFiltering) {
    countCql += ` ALLOW FILTERING`;
  }

  let totalItems = 0;
  try {
    const countResult = await client.execute(countCql, params, {
      prepare: true,
    });
    totalItems = Number(countResult.rows[0]["count"]) || 0;
  } catch (error: any) {
    logError("scylla", error, __filename);
    throw new Error("Error executing count query: " + error.message);
  }

  const currentPage = query.page ? Number(query.page) : 1;
  const offset = (currentPage - 1) * perPage;

  // Build main data query.
  let dataCql = `SELECT * FROM ${fullTableName}`;
  if (whereClause) {
    dataCql += ` WHERE ${whereClause}`;
  }

  let addOrderBy = false;
  if (sortField && partitionKeys && partitionKeys.length > 0) {
    addOrderBy = partitionKeys.every((pk) => {
      const filterValue = filter && filter[pk];
      return (
        filterValue &&
        (filterValue.operator === "equal" || filterValue.operator === "in")
      );
    });
  }
  if (addOrderBy) {
    dataCql += ` ORDER BY ${quoteColumn(sortField)} ${sortOrder.toUpperCase()}`;
  }
  if (allowFiltering) {
    dataCql += ` ALLOW FILTERING`;
  }

  let allRows: any[] = [];
  try {
    const dataResult = await client.execute(dataCql, params, { prepare: true });
    allRows = dataResult.rows;
  } catch (error: any) {
    logError("scylla", error, __filename);
    throw new Error("Error executing data query: " + error.message);
  }

  // If server-side sorting wasn't applied, do an in-memory sort.
  if (!addOrderBy && sortField) {
    allRows.sort((a, b) => {
      const aRaw = a[sortField];
      const bRaw = b[sortField];
      // Attempt to coerce to number.
      const aNum = Number(aRaw);
      const bNum = Number(bRaw);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return String(aRaw).localeCompare(String(bRaw));
    });
    if (sortOrder.toUpperCase() === "DESC") {
      allRows.reverse();
    }
  }

  let items = allRows.slice(offset, offset + perPage);
  const totalPages = Math.ceil(totalItems / perPage);

  if (transformColumns && transformColumns.length > 0) {
    items = items.map((row) => {
      transformColumns.forEach((col) => {
        if (row[col] !== undefined && row[col] !== null) {
          try {
            row[col] =
              typeof row[col] === "bigint"
                ? fromBigInt(row[col])
                : fromBigInt(BigInt(row[col]));
          } catch (error) {
            // Leave value as is on conversion failure.
          }
        }
      });
      return row;
    });
  }

  return {
    items,
    pagination: { totalItems, currentPage, perPage, totalPages },
  };
}