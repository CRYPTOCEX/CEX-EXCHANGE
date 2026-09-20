"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of Staking Pools",
    operationId: "bulkUpdateStakingPoolStatus",
    tags: ["Admin", "Staking", "Pools"],
    logModule: "ADMIN_STAKE",
    logTitle: "Update Pool Status",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of Staking Pool IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the Staking Pools (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Staking Pool"),
    requiresAuth: true,
    permission: "edit.staking.pool",
};
exports.default = async (data) => {
    const { body } = data;
    const { ids, status } = body;
    return (0, query_1.updateStatus)("stakingPool", ids, status);
};
