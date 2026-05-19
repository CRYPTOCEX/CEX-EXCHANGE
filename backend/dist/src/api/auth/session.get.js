"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("./../../utils/query");
exports.metadata = {
    summary: "Retrieves session data by sessionId",
    operationId: "getSessionData",
    tags: ["Session"],
    description: "Retrieves session data from Redis by sessionId",
    requiresAuth: true,
    responses: {
        200: {
            description: "Session data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "string",
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Category"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = (data) => {
    const { user, cookies } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    return cookies.accessToken;
};
