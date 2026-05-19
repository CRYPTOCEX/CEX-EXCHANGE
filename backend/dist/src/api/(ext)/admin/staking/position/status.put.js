"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of Staking Positions",
    operationId: "bulkUpdateStakingPositionStatus",
    tags: ["Staking", "Admin", "Positions"],
    logModule: "ADMIN_STAKE",
    logTitle: "Update Position Status",
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
                            description: "Array of Staking Position IDs to update",
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "COMPLETED", "CANCELLED", "PENDING_WITHDRAWAL"],
                            description: "New status to apply to the Staking Positions",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Staking Position"),
    requiresAuth: true,
    permission: "edit.staking.position",
};
exports.default = async (data) => {
    const { body } = data;
    const { ids, status } = body;
    return (0, query_1.updateStatus)("stakingPosition", ids, status);
};
