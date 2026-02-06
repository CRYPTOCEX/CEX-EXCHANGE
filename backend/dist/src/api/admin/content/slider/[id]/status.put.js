"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates the status of a slider",
    operationId: "updateSliderStatus",
    tags: ["Admin", "Sliders"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the slider to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "boolean",
                            description: "New status to apply (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Slider"),
    requiresAuth: true,
    permission: "edit.slider",
    logModule: "ADMIN_CMS",
    logTitle: "Update slider status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating slider status to ${status ? 'active' : 'inactive'}`);
    const result = await (0, query_1.updateStatus)("slider", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Slider status updated successfully");
    return result;
};
