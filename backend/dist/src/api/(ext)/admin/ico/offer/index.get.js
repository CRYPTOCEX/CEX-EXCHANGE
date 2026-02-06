"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Lists ICO offerings with computed currentRaised",
    operationId: "listIcoTransactions",
    tags: ["User", "Ico", "Transaction"],
    parameters: constants_1.crudParameters,
    responses: {
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Transactions"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_ICO",
    logTitle: "Get ICO Offers",
    permission: "view.ico.offer",
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authentication");
    if (!user) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch ICO offerings with computed metrics");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.icoTokenOffering,
        query,
        sortField: query.sortField || "createdAt",
        compute: [
            [
                (0, sequelize_1.literal)(`(
          SELECT COALESCE(SUM(t.price * t.amount), 0)
          FROM ico_transaction t
          WHERE t.offeringId = icoTokenOffering.id
            AND t.status IN ('PENDING', 'RELEASED')
        )`),
                "currentRaised",
            ],
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get ICO Offers retrieved successfully");
    return result;
};
