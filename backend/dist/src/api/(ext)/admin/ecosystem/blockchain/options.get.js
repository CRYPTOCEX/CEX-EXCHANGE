"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Get available blockchain options",
    description: "Retrieves a list of supported blockchain options for the ecosystem. Returns a static list of EVM-compatible chains (Arbitrum, Base, BSC, Celo, Ethereum, Fantom, Optimism, Polygon, RSK) and conditionally includes Solana and Mo Chain if they are enabled in the database.",
    operationId: "getEcosystemBlockchainOptions",
    tags: ["Admin", "Ecosystem", "Blockchain"],
    requiresAuth: true,
    logModule: "ADMIN_ECO",
    logTitle: "Get blockchain options",
    responses: {
        200: {
            description: "Blockchain options retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: {
                                    type: "string",
                                    description: "Blockchain chain identifier",
                                    example: "ETH"
                                },
                                name: {
                                    type: "string",
                                    description: "Blockchain display name with symbol",
                                    example: "Ethereum (ETH)"
                                },
                            },
                            required: ["id", "name"]
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "view.ecosystem.blockchain",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving blockchain statuses");
        const chains = await db_1.models.ecosystemBlockchain.findAll({
            where: { chain: ["SOL", "MO"] },
        });
        const solanaBlockchain = chains.find((c) => c.chain === "SOL" && c.status);
        const moBlockchain = chains.find((c) => c.chain === "MO" && c.status);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Building blockchain options list");
        const blockchainOptions = [
            { id: "ARBITRUM", name: "Arbitrum (ARB)" },
            { id: "BASE", name: "Base (BASE)" },
            { id: "BSC", name: "Binance Smart Chain (BSC)" },
            { id: "CELO", name: "Celo (CELO)" },
            { id: "ETH", name: "Ethereum (ETH)" },
            { id: "FTM", name: "Fantom (FTM)" },
            { id: "OPTIMISM", name: "Optimism (OVM)" },
            { id: "POLYGON", name: "Polygon (MATIC)" },
            { id: "RSK", name: "RSK (RSK)" },
            ...(solanaBlockchain ? [{ id: "SOL", name: "Solana (SOL)" }] : []),
            ...(moBlockchain ? [{ id: "MO", name: "Mo Chain (MO)" }] : []),
        ];
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Blockchain options retrieved successfully");
        return blockchainOptions;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message);
        throw (0, error_1.createError)(500, "An error occurred while fetching blockchain options");
    }
};
