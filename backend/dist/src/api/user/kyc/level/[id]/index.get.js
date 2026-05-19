"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getKycLevelById = getKycLevelById;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Fetch a specific active KYC level by ID",
    description: "Fetches an active KYC (Know Your Customer) level by its ID. This endpoint requires authentication.",
    operationId: "getKycLevelById",
    tags: ["KYC"],
    logModule: "USER",
    logTitle: "Get KYC level",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "The ID of the KYC level to retrieve",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "KYC level retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "number", description: "Level ID" },
                            title: { type: "string", description: "Level title" },
                            options: {
                                type: "object",
                                description: "Level options as JSON object",
                                nullable: true,
                            },
                            status: {
                                type: "boolean",
                                description: "Active status of the level",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("KYC Level"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving KYC level");
    const result = await getKycLevelById(id, user.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("KYC level retrieved successfully");
    return result;
};
async function getKycLevelById(id, userId) {
    const { Op } = require("sequelize");
    const level = await db_1.models.kycLevel.findOne({
        where: { id, status: "ACTIVE" },
    });
    if (!level) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "No active KYC level found",
        });
    }
    if (userId && level.level > 1) {
        const previousLevels = await db_1.models.kycLevel.findAll({
            where: {
                level: { [Op.lt]: level.level },
                status: "ACTIVE",
            },
            attributes: ["id", "level", "fields"],
        });
        const configuredPreviousLevels = previousLevels.filter((prevLevel) => {
            let fields = prevLevel.fields;
            if (typeof fields === "string") {
                try {
                    fields = JSON.parse(fields);
                }
                catch (_a) {
                    return false;
                }
            }
            return Array.isArray(fields) && fields.length > 0;
        });
        for (const prevLevel of configuredPreviousLevels) {
            const approvedApp = await db_1.models.kycApplication.findOne({
                where: {
                    userId,
                    levelId: prevLevel.id,
                    status: "APPROVED",
                },
            });
            if (!approvedApp) {
                throw (0, error_1.createError)({
                    statusCode: 403,
                    message: `You must complete Level ${prevLevel.level} verification before accessing Level ${level.level}`,
                });
            }
        }
    }
    return level.get({ plain: true });
}
