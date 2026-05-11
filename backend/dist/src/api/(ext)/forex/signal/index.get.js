"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
exports.metadata = { summary: "Get user's Forex signals",
    description: "Retrieves all forex signals available to the current user with pagination",
    operationId: "getUserForexSignals",
    tags: ["Forex", "Signals"],
    requiresAuth: true,
    logModule: "FOREX",
    logTitle: "Get Forex Signals",
    parameters: constants_1.crudParameters,
    responses: { 200: { description: "Forex signals retrieved successfully",
            content: { "application/json": { schema: { type: "object",
                        properties: { data: { type: "array",
                                items: { type: "object",
                                    properties: { id: { type: "string" },
                                        title: { type: "string" },
                                        description: { type: "string" },
                                        image: { type: "string" },
                                        status: { type: "boolean" },
                                        createdAt: { type: "string", format: "date-time" },
                                        updatedAt: { type: "string", format: "date-time" },
                                    },
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Signals"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        const userAccounts = await db_1.models.forexAccount.findAll({ where: { userId: user.id },
            attributes: ["id"],
        });
        if (userAccounts.length === 0) {
            return { data: [],
                pagination: { page: 1,
                    perPage: (query === null || query === void 0 ? void 0 : query.perPage) || 10,
                    total: 0,
                    totalPages: 0, },
            };
        }
        const accountIds = userAccounts.map(account => account.id);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
        return (0, query_1.getFiltered)({ model: db_1.models.forexSignal,
            query,
            where: { status: true },
            sortField: (query === null || query === void 0 ? void 0 : query.sortField) || "createdAt",
            includeModels: [
                { model: db_1.models.forexAccount,
                    as: "accounts",
                    where: { id: accountIds },
                    through: { attributes: [] },
                    required: false,
                },
            ], });
    }
    catch (error) {
        console.error("Error fetching forex signals:", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error" });
    }
};
