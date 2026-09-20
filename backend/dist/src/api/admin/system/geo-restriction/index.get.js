"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists geographic access restrictions with pagination and filtering",
    operationId: "listGeoRestrictions",
    tags: ["Admin", "Geo Restrictions"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "List of geographic restrictions",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: { type: "object", properties: utils_1.geoRestrictionSchema },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Geo Restrictions"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.geo.restriction",
};
exports.default = async (data) => {
    const { query } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.geoRestriction,
        query,
        sortField: query.sortField || "countryName",
    });
};
