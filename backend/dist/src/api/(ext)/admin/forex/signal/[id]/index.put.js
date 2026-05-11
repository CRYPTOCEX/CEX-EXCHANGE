"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a Forex signal",
    description: "Updates an existing Forex trading signal by its ID. Can modify title, image, and active status.",
    operationId: "updateForexSignal",
    tags: ["Admin", "Forex", "Signal"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the Forex Signal to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the Forex Signal",
        content: {
            "application/json": {
                schema: utils_1.forexSignalUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Forex Signal"),
    requiresAuth: true,
    permission: "edit.forex.signal",
    logModule: "ADMIN_FOREX",
    logTitle: "Update forex signal",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { title, image, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating record ${id}`);
    const result = await (0, query_1.updateRecord)("forexSignal", id, {
        title,
        image,
        status,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Record updated successfully");
    return result;
};
