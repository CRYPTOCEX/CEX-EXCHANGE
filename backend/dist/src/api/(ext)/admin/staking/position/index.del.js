"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes Staking Positions by IDs",
    operationId: "bulkDeleteStakingPositions",
    tags: ["Staking", "Admin", "Positions"],
    logModule: "ADMIN_STAKE",
    logTitle: "Bulk Delete Positions",
    parameters: (0, query_1.commonBulkDeleteParams)("Staking Positions"),
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of Staking Position IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Staking Positions"),
    requiresAuth: true,
    permission: "delete.staking.position",
};
exports.default = async (data) => {
    const { body, query } = data;
    const { ids } = body;
    return (0, query_1.handleBulkDelete)({
        model: "stakingPosition",
        ids,
        query,
    });
};
