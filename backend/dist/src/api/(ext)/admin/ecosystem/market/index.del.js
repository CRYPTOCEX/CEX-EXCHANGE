"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const queries_1 = require("@b/api/(ext)/ecosystem/utils/scylla/queries");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Bulk deletes ecosystem markets",
    description: "Deletes multiple ecosystem markets by their IDs. This operation also removes all associated market data from the database for each market. The markets are permanently deleted (force delete).",
    operationId: "bulkDeleteEcosystemMarkets",
    tags: ["Admin", "Ecosystem", "Market"],
    parameters: (0, query_1.commonBulkDeleteParams)("Ecosystem Markets"),
    logModule: "ADMIN_ECO",
    logTitle: "Bulk delete markets",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string", format: "uuid" },
                            description: "Array of ecosystem market IDs to delete (at least 1 required)",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Markets deleted successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Ecosystem Market"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "delete.ecosystem.market",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw (0, error_1.createError)(400, "No market IDs provided");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching ${ids.length} market(s) for deletion`);
    const markets = await db_1.models.ecosystemMarket.findAll({
        where: { id: ids },
        attributes: ["currency"],
        paranoid: false,
    });
    console.log("🚀 ~ markets:", markets);
    if (!markets.length) {
        throw (0, error_1.createError)(404, "No matching markets found for provided IDs");
    }
    const postDelete = async () => {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting market data for all markets");
        for (const market of markets) {
            await (0, queries_1.deleteAllMarketData)(market.currency);
        }
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting market records");
    const result = await (0, query_1.handleBulkDelete)({
        model: "ecosystemMarket",
        ids: ids,
        query: { ...query, force: true },
        postDelete,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} market(s) deleted successfully`);
    return result;
};
