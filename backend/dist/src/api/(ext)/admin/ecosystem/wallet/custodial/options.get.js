"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Get available master wallets for custodial wallet creation",
    description: "Retrieves a list of master wallets that support custodial wallet creation. Excludes chains that do not support smart contract deployment (SOL, TRON, BTC, LTC, DOGE, DASH, XMR, TON, MO).",
    operationId: "getEcosystemCustodialWalletOptions",
    tags: ["Admin", "Ecosystem", "Wallet"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Ecosystem custodial wallet options retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                value: { type: "string" },
                                label: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("EcosystemMasterWallet"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching custodial wallet options");
    try {
        const masterWallets = await db_1.models.ecosystemMasterWallet.findAll({
            where: {
                chain: {
                    [sequelize_1.Op.notIn]: [
                        "SOL",
                        "TRON",
                        "BTC",
                        "LTC",
                        "DOGE",
                        "DASH",
                        "XMR",
                        "TON",
                        "MO",
                    ],
                },
            },
        });
        const options = masterWallets.map((wallet) => ({
            value: wallet.id,
            label: `${wallet.chain} - ${wallet.address.substring(0, 10)}...`,
        }));
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${options.length} custodial wallet options`);
        return options;
    }
    catch (error) {
        throw (0, error_1.createError)(500, "An error occurred while fetching ecosystem custodial wallet options");
    }
};
