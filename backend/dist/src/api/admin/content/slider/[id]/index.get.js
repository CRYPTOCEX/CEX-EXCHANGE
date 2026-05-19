"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves detailed information of a specific slider by ID",
    operationId: "getSliderById",
    tags: ["Admin", "Sliders"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the slider to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Slider details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.sliderSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Slider"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.slider",
    requiresAuth: true,
    logModule: "ADMIN_CMS",
    logTitle: "Get slider details",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching slider with ID: ${params.id}`);
    const slider = await (0, query_1.getRecord)("slider", params.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Slider retrieved successfully");
    return slider;
};
