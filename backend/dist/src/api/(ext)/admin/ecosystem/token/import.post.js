"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Imports an existing ecosystem token",
    description: "Imports an existing token by providing contract details, network information, and token metadata. This endpoint is used to add already-deployed tokens to the platform without deploying a new contract.",
    operationId: "importEcosystemToken",
    tags: ["Admin", "Ecosystem", "Token"],
    logModule: "ADMIN_ECO",
    logTitle: "Import token",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.ecosystemTokenImportSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Ecosystem token imported successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                            record: {
                                type: "object",
                                properties: {
                                    id: { type: "string", description: "Token ID" },
                                    contract: { type: "string", description: "Contract address" },
                                    name: { type: "string", description: "Token name" },
                                    currency: { type: "string", description: "Token currency symbol" },
                                    chain: { type: "string", description: "Blockchain chain" },
                                    network: { type: "string", description: "Network type" },
                                    type: { type: "string", description: "Token type" },
                                    decimals: { type: "number", description: "Token decimals" },
                                    contractType: {
                                        type: "string",
                                        enum: ["PERMIT", "NO_PERMIT", "NATIVE"],
                                        description: "Contract type",
                                    },
                                    status: { type: "boolean", description: "Token status" },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: query_1.unauthorizedResponse,
        409: (0, errors_1.conflictResponse)("Ecosystem Token"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "create.ecosystem.token",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { icon, name, currency, chain, network, contract, contractType, decimals, precision, type, fee, limits, status, } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sanitizing token data");
        const sanitizedData = {
            icon,
            name,
            currency,
            chain,
            network,
            contract,
            contractType,
            decimals,
            precision,
            type,
            fee: typeof fee === "object" ? JSON.stringify(fee) : fee,
            limits: typeof limits === "object" ? JSON.stringify(limits) : limits,
            status,
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Importing token to database");
        const result = await (0, query_1.storeRecord)({
            model: "ecosystemToken",
            data: sanitizedData,
            returnResponse: true,
        });
        if (result.record && icon) {
            try {
                await (0, utils_1.updateIconInCache)(currency, icon, ctx);
            }
            catch (error) {
                ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Failed to update icon in cache: ${error.message}`);
                console.error(`Failed to update icon in cache for ${currency}:`, error);
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Token ${currency} imported successfully`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message);
        console.error(`Error importing ecosystem token:`, error);
        if (error.name === "SequelizeValidationError") {
            console.error("Validation failed for one or more fields.");
        }
        else if (error.name === "SequelizeDatabaseError") {
            console.error("Database error occurred.");
        }
        throw error;
    }
};
