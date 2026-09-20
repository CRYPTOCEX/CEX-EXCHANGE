"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Delete a Price Alert",
    operationId: "deletePriceAlert",
    tags: ["Exchange", "Alerts"],
    description: "Removes one price alert belonging to the authenticated user.",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Alert id",
            schema: { type: "string" },
        },
    ],
    responses: (0, query_1.deleteRecordResponses)("Price Alert"),
    requiresAuth: true,
    logModule: "EXCHANGE",
    logTitle: "Delete Price Alert",
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const id = params === null || params === void 0 ? void 0 : params.id;
    if (!id) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing alert id" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching alert");
    const alert = await db_1.models.exchangePriceAlert.findOne({
        where: { id, userId: user.id },
    });
    if (!alert) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Price alert not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting alert");
    await db_1.models.exchangePriceAlert.destroy({ where: { id, userId: user.id } });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Deleted alert on ${alert.symbol}`);
    return { message: "Price alert deleted" };
};
