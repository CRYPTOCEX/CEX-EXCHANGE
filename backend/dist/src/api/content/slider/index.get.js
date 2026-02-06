"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "List all sliders",
    operationId: "listSliders",
    tags: ["Sliders"],
    responses: {
        200: {
            description: "Sliders retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.baseSliderSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Sliders"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    return await db_1.models.slider.findAll({
        where: { status: true },
    });
};
