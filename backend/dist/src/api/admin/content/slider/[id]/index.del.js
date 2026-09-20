"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a slider",
    operationId: "deleteSlider",
    tags: ["Admin", "Sliders"],
    parameters: (0, query_1.deleteRecordParams)("slider"),
    responses: (0, query_1.deleteRecordResponses)("Slider"),
    permission: "delete.slider",
    requiresAuth: true,
    logModule: "ADMIN_CMS",
    logTitle: "Delete slider",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting slider with ID: ${id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "slider",
        id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Slider deleted successfully");
    return result;
};
