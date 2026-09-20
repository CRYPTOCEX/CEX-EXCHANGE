"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Lists ScyllaDB tables",
    description: "Returns the base tables of the ecosystem and futures keyspaces with their columns and primary key, for the admin record browser",
    operationId: "listScyllaSchema",
    tags: ["Admin", "Database"],
    requiresAuth: true,
    responses: {
        200: {
            description: "ScyllaDB schema",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            keyspaces: { type: "array", items: { type: "string" } },
                            tables: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        keyspace: { type: "string" },
                                        table: { type: "string" },
                                        partitionKey: { type: "array", items: { type: "string" } },
                                        clusteringKey: { type: "array", items: { type: "string" } },
                                        columns: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    name: { type: "string" },
                                                    type: { type: "string" },
                                                    kind: { type: "string" },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        503: { description: "Ecosystem extension not installed, or ScyllaDB unreachable" },
        500: { description: "Internal server error" },
    },
    permission: "access.database",
};
exports.default = async (data) => {
    try {
        const { client, keyspaces } = await (0, utils_1.getScylla)();
        const schema = await (0, utils_1.readSchema)(client, keyspaces);
        return {
            keyspaces,
            tables: schema.map((t) => ({
                keyspace: t.keyspace,
                table: t.table,
                partitionKey: t.partitionKey,
                clusteringKey: t.clusteringKey,
                columns: Object.keys(t.columns).map((name) => ({
                    name,
                    type: t.columns[name],
                    kind: t.partitionKey.includes(name)
                        ? "partition_key"
                        : t.clusteringKey.includes(name)
                            ? "clustering"
                            : "regular",
                })),
            })),
        };
    }
    catch (error) {
        if (error.statusCode)
            throw error;
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
};
