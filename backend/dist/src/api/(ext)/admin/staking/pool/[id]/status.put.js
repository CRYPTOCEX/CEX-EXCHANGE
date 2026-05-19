"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates the status of a Staking Pool",
    operationId: "updateStakingPoolStatus",
    tags: ["Admin", "Staking", "Pools"],
    logModule: "ADMIN_STAKE",
    logTitle: "Update Single Pool Status",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the Staking Pool to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "boolean",
                            description: "New status to apply (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Staking Pool"),
    requiresAuth: true,
    permission: "edit.staking.pool",
};
exports.default = async (data) => {
    const { body, params } = data;
    const { id } = params;
    const { status } = body;
    return (0, query_1.updateStatus)("stakingPool", id, status);
};
