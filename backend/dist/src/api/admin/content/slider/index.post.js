"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Stores a new Slider",
    operationId: "storeSlider",
    tags: ["Admin", "Sliders"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: utils_1.sliderSchema,
                    required: ["image"],
                },
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.sliderSchema, "Slider"),
    requiresAuth: true,
    permission: "create.slider",
    logModule: "ADMIN_CMS",
    logTitle: "Create slider",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { image, link, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating slider data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating slider");
    const result = await (0, query_1.storeRecord)({
        model: "slider",
        data: {
            image,
            link,
            status,
        },
        returnResponse: true,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Slider created successfully");
    return result;
};
