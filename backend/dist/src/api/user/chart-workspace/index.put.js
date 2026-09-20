"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const MAX_VALUE_BYTES = 512 * 1024;
const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const MAX_ENTRIES = 64;
const MAX_KEY_LENGTH = 191;
exports.metadata = {
    summary: "Saves changed entries of the signed-in user's chart workspace",
    description: "Upserts the supplied keys for the current user. Only changed keys should be sent. A null value deletes the key. Values are opaque JSON and are not interpreted by the server.",
    operationId: "putChartWorkspace",
    tags: ["Chart"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        entries: {
                            type: "array",
                            description: "The keys that changed. Others are left untouched.",
                            items: {
                                type: "object",
                                properties: {
                                    key: {
                                        type: "string",
                                        description: "Client-side storage key",
                                    },
                                    value: {
                                        type: "string",
                                        nullable: true,
                                        description: "Opaque JSON, or null to delete the key",
                                    },
                                },
                                required: ["key"],
                            },
                        },
                    },
                    required: ["entries"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Workspace saved",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            saved: { type: "number", description: "Entries written" },
                            removed: { type: "number", description: "Entries deleted" },
                            versions: {
                                type: "object",
                                description: "New version per written key",
                                additionalProperties: { type: "number" },
                            },
                        },
                        required: ["saved", "removed", "versions"],
                    },
                },
            },
        },
        400: query_1.invalidRequestResponse,
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, body } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Authentication required, Please log in.",
        });
    }
    const entries = body === null || body === void 0 ? void 0 : body.entries;
    if (!Array.isArray(entries)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "entries must be an array" });
    }
    if (entries.length === 0) {
        return { saved: 0, removed: 0, versions: {} };
    }
    if (entries.length > MAX_ENTRIES) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `At most ${MAX_ENTRIES} entries per request`,
        });
    }
    let totalBytes = 0;
    const writes = [];
    const deletes = [];
    for (const raw of entries) {
        const entry = raw;
        const key = typeof entry.key === "string" ? entry.key.trim() : "";
        if (key.length === 0) {
            throw (0, error_1.createError)({ statusCode: 400, message: "entry key is required" });
        }
        if (key.length > MAX_KEY_LENGTH) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `entry key exceeds ${MAX_KEY_LENGTH} characters`,
            });
        }
        if (entry.value === null || entry.value === undefined) {
            deletes.push(key);
            continue;
        }
        if (typeof entry.value !== "string") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `entry ${key}: value must be a string or null`,
            });
        }
        const bytes = Buffer.byteLength(entry.value, "utf8");
        if (bytes > MAX_VALUE_BYTES) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `entry ${key}: value exceeds ${MAX_VALUE_BYTES} bytes`,
            });
        }
        totalBytes += bytes;
        if (totalBytes > MAX_REQUEST_BYTES) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `request exceeds ${MAX_REQUEST_BYTES} bytes`,
            });
        }
        writes.push({ key, value: entry.value });
    }
    const versions = {};
    await db_1.sequelize.transaction(async (transaction) => {
        if (deletes.length > 0) {
            await db_1.models.chartWorkspace.destroy({
                where: { userId: user.id, key: deletes },
                transaction,
            });
        }
        for (const write of writes) {
            const existing = await db_1.models.chartWorkspace.findOne({
                where: { userId: user.id, key: write.key },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (existing) {
                const nextVersion = existing.version + 1;
                await existing.update({ value: write.value, version: nextVersion }, { transaction });
                versions[write.key] = nextVersion;
            }
            else {
                await db_1.models.chartWorkspace.create({ userId: user.id, key: write.key, value: write.value, version: 1 }, { transaction });
                versions[write.key] = 1;
            }
        }
    });
    return { saved: writes.length, removed: deletes.length, versions };
};
