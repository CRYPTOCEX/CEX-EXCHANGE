"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Delete a Mailwizard template",
    operationId: "deleteMailwizardTemplate",
    tags: ["Admin", "Mailwizard", "Templates"],
    description: "Permanently deletes a specific Mailwizard template by ID. This operation cannot be undone. Templates that are currently in use by active campaigns cannot be deleted.",
    parameters: (0, query_1.deleteRecordParams)("Mailwizard template"),
    responses: (0, errors_1.deleteResponses)("Mailwizard Template"),
    permission: "delete.mailwizard.template",
    requiresAuth: true,
    logModule: "ADMIN_MAIL",
    logTitle: "Delete template",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting template");
    const result = await (0, query_1.handleSingleDelete)({
        model: "mailwizardTemplate",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Template deleted successfully");
    return result;
};
