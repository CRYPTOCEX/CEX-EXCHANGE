"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Get signals for a specific Forex account",
    description: "Retrieves all signals associated with a specific forex account",
    operationId: "getForexAccountSignals",
    tags: ["Forex", "Account", "Signals"],
    logModule: "FOREX",
    logTitle: "Get Account Signals",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the forex account",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Account signals retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                title: { type: "string" },
                                description: { type: "string" },
                                image: { type: "string" },
                                status: { type: "boolean" },
                                createdAt: { type: "string", format: "date-time" },
                                updatedAt: { type: "string", format: "date-time" },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Account"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Account Signals");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    try {
        const account = await db_1.models.forexAccount.findOne({
            where: { id, userId: user.id },
        });
        if (!account) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Forex Account not found" });
        }
        const signals = await db_1.models.forexSignal.findAll({
            include: [
                {
                    model: db_1.models.forexAccount,
                    as: "accounts",
                    where: { id },
                    through: { attributes: [] },
                    required: true,
                },
            ],
            where: { status: true },
            attributes: ["id", "title", "description", "image", "status", "createdAt", "updatedAt"],
            order: [["createdAt", "DESC"]],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Account Signals fetched successfully");
        return signals;
    }
    catch (error) {
        if (error.statusCode) {
            throw error;
        }
        console.error("Error fetching account signals:", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error" });
    }
};
