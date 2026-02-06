"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Get Active Blockchain Configurations",
    description: "Retrieves all active blockchain configurations for users.",
    operationId: "getActiveBlockchainConfigs",
    tags: ["ICO", "Blockchain"],
    logModule: "ICO",
    logTitle: "Get active blockchains",
    responses: {
        200: {
            description: "Active blockchain configurations retrieved successfully.",
            content: {
                "application/json": {
                    schema: { type: "array", items: { type: "object" } },
                },
            },
        },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching active blockchain configurations");
    const activeBlockchains = await db_1.models.icoBlockchain.findAll({
        where: { status: true },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${activeBlockchains.length} active blockchains`);
    return activeBlockchains;
};
