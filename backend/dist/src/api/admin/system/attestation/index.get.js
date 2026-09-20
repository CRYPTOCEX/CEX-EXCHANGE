"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
exports.metadata = {
    summary: "Lists operator licence attestations",
    description: "The countries this operator has recorded a licence for, per module. A regulated module is served only to residents of a country with a live attestation.",
    operationId: "listOperatorAttestations",
    tags: ["Admin", "System", "Attestation"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Paginated list of attestations",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: { type: "array", items: { type: "object" } },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Operator Attestations"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.geo.restriction",
    logModule: "ADMIN_SYSTEM",
    logTitle: "List operator attestations",
};
exports.default = async (data) => {
    const { query } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.operatorAttestation,
        query,
        sortField: query.sortField || "expiresAt",
        timestamps: true,
    });
};
