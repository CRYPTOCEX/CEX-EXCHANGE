"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Deletes a ScyllaDB record",
    description: "Deletes one row, addressed by its complete primary key. The row is read back first so the audit log records what was removed.",
    operationId: "deleteScyllaRecord",
    tags: ["Admin", "Database"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        keyspace: { type: "string" },
                        table: { type: "string" },
                        key: {
                            type: "object",
                            description: "Every partition-key and clustering column of the row",
                        },
                    },
                    required: ["keyspace", "table", "key"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Record deleted",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            deleted: { type: "object", description: "The row as it was before deletion" },
                        },
                    },
                },
            },
        },
        400: { description: "Invalid request" },
        404: { description: "Unknown table, or no row behind that primary key" },
        503: { description: "Ecosystem extension not installed, or ScyllaDB unreachable" },
        500: { description: "Internal server error" },
    },
    permission: "access.database",
    logModule: "ADMIN_SYS",
    logTitle: "ScyllaDB record delete",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    try {
        const { client, keyspaces } = await (0, utils_1.getScylla)();
        const { types } = require("cassandra-driver");
        const schema = await (0, utils_1.readSchema)(client, keyspaces);
        const t = (0, utils_1.resolveTable)(schema, String(body === null || body === void 0 ? void 0 : body.keyspace), String(body === null || body === void 0 ? void 0 : body.table));
        const key = body === null || body === void 0 ? void 0 : body.key;
        if (!key || typeof key !== "object" || Array.isArray(key)) {
            throw (0, error_1.createError)({ statusCode: 400, message: "key must be an object" });
        }
        const pk = [...t.partitionKey, ...t.clusteringKey];
        const missing = pk.filter((k) => key[k] === undefined || key[k] === null);
        if (missing.length) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `key must contain every primary-key column; missing: ${missing.join(", ")}. ` +
                    `A partial key would delete the whole partition.`,
            });
        }
        const whereCql = pk.map((k) => `"${k}" = ?`).join(" AND ");
        const whereParams = pk.map((k) => (0, utils_1.decodeValue)(key[k], t.columns[k], types));
        const existing = await client.execute(`SELECT * FROM "${t.keyspace}"."${t.table}" WHERE ${whereCql}`, whereParams, { prepare: true });
        if (!existing.rows.length) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "No row behind that primary key",
            });
        }
        const deleted = {};
        for (const k of Object.keys(existing.rows[0])) {
            deleted[k] = (0, utils_1.encodeValue)(existing.rows[0][k]);
        }
        await client.execute(`DELETE FROM "${t.keyspace}"."${t.table}" WHERE ${whereCql}`, whereParams, { prepare: true });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Deleted from ${t.keyspace}.${t.table} [${pk
            .map((k) => `${k}=${key[k]}`)
            .join(", ")}]`);
        return { message: "Record deleted", deleted };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`ScyllaDB record delete failed: ${error.message}`);
        if (error.statusCode)
            throw error;
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
};
