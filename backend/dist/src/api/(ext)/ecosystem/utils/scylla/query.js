"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFiltered = getFiltered;
const client_1 = __importDefault(require("./client"));
const console_1 = require("@b/utils/console");
const blockchain_1 = require("../blockchain");
const cassandra_driver_1 = require("cassandra-driver");
const error_1 = require("@b/utils/error");
const operatorMap = {
    equal: "=",
    greaterThan: ">",
    greaterThanOrEqual: ">=",
    lessThan: "<",
    lessThanOrEqual: "<=",
    like: "LIKE",
    notLike: "NOT LIKE",
};
function quoteColumn(key) {
    return /[A-Z]/.test(key) ? `"${key}"` : key;
}
function formatUuid(hexStr) {
    return (hexStr.substr(0, 8) +
        "-" +
        hexStr.substr(8, 4) +
        "-" +
        hexStr.substr(12, 4) +
        "-" +
        hexStr.substr(16, 4) +
        "-" +
        hexStr.substr(20, 12));
}
function buildWhereClause(filter, nonStringLikeColumns = []) {
    if (typeof filter === "string") {
        try {
            filter = JSON.parse(decodeURIComponent(filter));
        }
        catch (e) {
            filter = {};
        }
    }
    if (!filter || typeof filter !== "object") {
        return { whereClause: "", values: [] };
    }
    const clauses = [];
    const values = [];
    for (const key in filter) {
        if (Object.prototype.hasOwnProperty.call(filter, key)) {
            const columnName = quoteColumn(key);
            const condition = filter[key];
            if (typeof condition === "object" &&
                condition.operator &&
                condition.value !== undefined) {
                if (condition.operator === "startsWith" ||
                    condition.operator === "like") {
                    if (nonStringLikeColumns.includes(key)) {
                        const prefix = condition.value.toString();
                        if (prefix.length < 36) {
                            const clean = prefix.replace(/-/g, "");
                            const lowerClean = clean.padEnd(32, "0");
                            const upperClean = clean.padEnd(32, "f");
                            const lowerStr = formatUuid(lowerClean);
                            const upperStr = formatUuid(upperClean);
                            try {
                                const lowerBound = cassandra_driver_1.types.Uuid.fromString(lowerStr);
                                const upperBound = cassandra_driver_1.types.Uuid.fromString(upperStr);
                                clauses.push(`${columnName} >= ?`);
                                values.push(lowerBound);
                                clauses.push(`${columnName} <= ?`);
                                values.push(upperBound);
                            }
                            catch (e) {
                                clauses.push(`${columnName} = ?`);
                                values.push(cassandra_driver_1.types.Uuid.fromString("00000000-0000-0000-0000-000000000000"));
                            }
                        }
                        else {
                            try {
                                const uuidVal = cassandra_driver_1.types.Uuid.fromString(condition.value);
                                clauses.push(`${columnName} = ?`);
                                values.push(uuidVal);
                            }
                            catch (e) {
                                clauses.push(`${columnName} = ?`);
                                values.push(cassandra_driver_1.types.Uuid.fromString("00000000-0000-0000-0000-000000000000"));
                            }
                        }
                        continue;
                    }
                    else {
                        clauses.push(`${columnName} LIKE ?`);
                        values.push(`${condition.value}%`);
                        continue;
                    }
                }
                if (nonStringLikeColumns.includes(key)) {
                    const unsupported = [
                        "notEqual",
                        "endsWith",
                        "substring",
                        "regexp",
                        "notRegexp",
                    ];
                    if (unsupported.includes(condition.operator)) {
                        throw (0, error_1.createError)({
                            statusCode: 400,
                            message: `Operator "${condition.operator}" is not supported for column "${key}" of non-string type`
                        });
                    }
                }
                const op = operatorMap[condition.operator];
                if (!op)
                    continue;
                clauses.push(`${columnName} ${op} ?`);
                values.push(condition.value);
            }
            else {
                clauses.push(`${columnName} = ?`);
                values.push(condition);
            }
        }
    }
    return { whereClause: clauses.join(" AND "), values };
}
async function getFiltered({ table, query, filter, sortField = "createdAt", sortOrder = "DESC", perPage = 10, allowFiltering = true, keyspace, partitionKeys, transformColumns, nonStringLikeColumns = [], }) {
    const fullTableName = keyspace ? `${keyspace}.${table}` : table;
    const { whereClause, values } = buildWhereClause(filter, nonStringLikeColumns);
    const params = [...values];
    let countCql = `SELECT count(*) FROM ${fullTableName}`;
    if (whereClause) {
        countCql += ` WHERE ${whereClause}`;
    }
    if (allowFiltering) {
        countCql += ` ALLOW FILTERING`;
    }
    let totalItems = 0;
    try {
        const countResult = await client_1.default.execute(countCql, params, {
            prepare: true,
        });
        totalItems = Number(countResult.rows[0]["count"]) || 0;
    }
    catch (error) {
        console_1.logger.error("SCYLLA", "Error executing count query", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Error executing count query: " + error.message });
    }
    const currentPage = query.page ? Number(query.page) : 1;
    const offset = (currentPage - 1) * perPage;
    let dataCql = `SELECT * FROM ${fullTableName}`;
    if (whereClause) {
        dataCql += ` WHERE ${whereClause}`;
    }
    let addOrderBy = false;
    if (sortField && partitionKeys && partitionKeys.length > 0) {
        addOrderBy = partitionKeys.every((pk) => {
            const filterValue = filter && filter[pk];
            return (filterValue &&
                (filterValue.operator === "equal" || filterValue.operator === "in"));
        });
    }
    if (addOrderBy) {
        dataCql += ` ORDER BY ${quoteColumn(sortField)} ${sortOrder.toUpperCase()}`;
    }
    if (allowFiltering) {
        dataCql += ` ALLOW FILTERING`;
    }
    let allRows = [];
    try {
        const dataResult = await client_1.default.execute(dataCql, params, { prepare: true });
        allRows = dataResult.rows;
    }
    catch (error) {
        console_1.logger.error("SCYLLA", "Error executing data query", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Error executing data query: " + error.message });
    }
    if (!addOrderBy && sortField) {
        allRows.sort((a, b) => {
            const aRaw = a[sortField];
            const bRaw = b[sortField];
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
                                ? (0, blockchain_1.fromBigInt)(row[col])
                                : (0, blockchain_1.fromBigInt)(BigInt(row[col]));
                    }
                    catch (error) {
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
