"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a specific Slider",
    operationId: "updateSlider",
    tags: ["Admin", "Sliders"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the Slider to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the Slider",
        content: {
            "application/json": {
                schema: utils_1.sliderUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Slider"),
    requiresAuth: true,
    permission: "edit.slider",
    logModule: "ADMIN_CMS",
    logTitle: "Update slider",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { image, link, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating slider data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating slider in database");
    const result = await (0, query_1.updateRecord)("slider", id, {
        image,
        link,
        status,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Slider updated successfully");
    return result;
};
