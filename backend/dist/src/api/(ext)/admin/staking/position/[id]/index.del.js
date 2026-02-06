"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific Staking Position",
    operationId: "deleteStakingPosition",
    tags: ["Staking", "Admin", "Positions"],
    logModule: "ADMIN_STAKE",
    logTitle: "Delete Staking Position",
    parameters: (0, query_1.deleteRecordParams)("Staking Position"),
    responses: (0, query_1.deleteRecordResponses)("Staking Position"),
    requiresAuth: true,
    permission: "delete.staking.position",
};
exports.default = async (data) => {
    const { params, query } = data;
    return (0, query_1.handleSingleDelete)({
        model: "stakingPosition",
        id: params.id,
        query,
    });
};
