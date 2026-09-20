"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Retrieves the signed-in user's saved chart workspace",
    description: "Returns every stored chart workspace entry for the current user as opaque key/value pairs. Values are JSON written by the chart client and are not interpreted by the server.",
    operationId: "getChartWorkspace",
    tags: ["Chart"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Workspace retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            entries: {
                                type: "array",
                                description: "One entry per stored key",
                                items: {
                                    type: "object",
                                    properties: {
                                        key: {
                                            type: "string",
                                            description: "Client-side storage key",
                                        },
                                        value: {
                                            type: "string",
                                            description: "Opaque JSON written by the chart",
                                        },
                                        version: {
                                            type: "number",
                                            description: "Monotonic write counter for this entry",
                                        },
                                    },
                                    required: ["key", "value", "version"],
                                },
                            },
                        },
                        required: ["entries"],
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Authentication required, Please log in.",
        });
    }
    const rows = await db_1.models.chartWorkspace.findAll({
        where: { userId: user.id },
        attributes: ["key", "value", "version"],
        order: [["key", "ASC"]],
    });
    return {
        entries: rows.map((row) => { var _a; return ({
            key: row.key,
            value: (_a = row.value) !== null && _a !== void 0 ? _a : "",
            version: row.version,
        }); }),
    };
};
