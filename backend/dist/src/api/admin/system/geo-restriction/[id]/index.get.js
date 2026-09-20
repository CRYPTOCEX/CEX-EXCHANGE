"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves a single geographic restriction by ID",
    operationId: "getGeoRestrictionById",
    tags: ["Admin", "Geo Restrictions"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the geographic restriction",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Geographic restriction details",
            content: {
                "application/json": {
                    schema: { type: "object", properties: utils_1.geoRestrictionSchema },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Geo Restriction"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.geo.restriction",
};
exports.default = async (data) => {
    const { params } = data;
    return await (0, query_1.getRecord)("geoRestriction", params.id);
};
