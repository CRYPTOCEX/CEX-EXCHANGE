"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Withdraws operator licence attestations",
    operationId: "bulkDeleteOperatorAttestations",
    tags: ["Admin", "System", "Attestation"],
    parameters: (0, query_1.commonBulkDeleteParams)("Attestations"),
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: { ids: { type: "array", items: { type: "string" } } },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Attestations"),
    requiresAuth: true,
    permission: "delete.geo.restriction",
    logModule: "ADMIN_SYSTEM",
    logTitle: "Withdraw operator attestations",
};
exports.default = async (data) => {
    const { body, query } = data;
    return (0, query_1.handleBulkDelete)({
        model: "operatorAttestation",
        ids: body.ids,
        query,
    });
};
