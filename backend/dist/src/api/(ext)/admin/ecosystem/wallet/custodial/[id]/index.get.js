"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const provider_1 = require("@b/api/(ext)/ecosystem/utils/provider");
const smartContract_1 = require("@b/api/(ext)/ecosystem/utils/smartContract");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const ethers_1 = require("ethers");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get custodial wallet balances and tokens",
    description: "Retrieves the native token balance and all ERC-20 token balances for a specific ecosystem custodial wallet by interacting with its smart contract.",
    operationId: "viewEcosystemCustodialWallet",
    tags: ["Admin", "Ecosystem", "Wallet"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the ecosystem custodial wallet",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    responses: {
        200: {
            description: "Custodial wallet balances retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            nativeBalance: {
                                type: "string",
                                description: "Native token balance",
                            },
                            tokenBalances: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        tokenAddress: {
                                            type: "string",
                                            description: "Token contract address",
                                        },
                                        name: {
                                            type: "string",
                                            description: "Token name",
                                        },
                                        currency: {
                                            type: "string",
                                            description: "Token currency",
                                        },
                                        icon: {
                                            type: "string",
                                            description: "Token icon URL",
                                        },
                                        balance: {
                                            type: "string",
                                            description: "Token balance",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        404: (0, query_1.notFoundMetadataResponse)("Custodial Wallet"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.ecosystem.custodial.wallet",
    demoMask: ["tokenBalances.tokenAddress"],
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching custodial wallet balances");
    try {
        const custodialWallet = await db_1.models.ecosystemCustodialWallet.findByPk(id);
        if (!custodialWallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Custodial wallet not found` });
        }
        const provider = await (0, provider_1.getProvider)(custodialWallet.chain);
        if (!provider) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Provider not initialized" });
        }
        const { abi } = await (0, smartContract_1.getSmartContract)("wallet", "CustodialWalletERC20");
        if (!abi) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Smart contract ABI not found" });
        }
        const contract = new ethers_1.ethers.Contract(custodialWallet.address, abi, provider);
        let nativeBalance;
        try {
            nativeBalance = await contract.getNativeBalance();
            if (nativeBalance === undefined) {
                nativeBalance = ethers_1.ethers.parseUnits("0", 18);
            }
        }
        catch (error) {
            console.error("Error fetching native balance:", error);
            nativeBalance = ethers_1.ethers.parseUnits("0", 18);
        }
        const tokens = await db_1.models.ecosystemToken.findAll({
            where: { chain: custodialWallet.chain, status: true },
            attributes: ["contract", "decimals", "name", "currency", "icon"],
        });
        const tokenAddresses = tokens.map((token) => token.contract);
        let tokenBalancesRaw;
        try {
            tokenBalancesRaw = await contract.getAllBalances(tokenAddresses);
            if (!tokenBalancesRaw || tokenBalancesRaw.length === 0) {
                tokenBalancesRaw = [
                    nativeBalance,
                    Array(tokenAddresses.length).fill(ethers_1.ethers.parseUnits("0", 18)),
                ];
            }
        }
        catch (callError) {
            console.error("Contract call error:", callError);
            tokenBalancesRaw = [
                nativeBalance,
                Array(tokenAddresses.length).fill(ethers_1.ethers.parseUnits("0", 18)),
            ];
        }
        const tokenBalances = tokenBalancesRaw[1].map((balance, index) => ({
            tokenAddress: tokenAddresses[index],
            name: tokens[index].name,
            currency: tokens[index].currency,
            icon: tokens[index].icon,
            balance: ethers_1.ethers.formatUnits(balance, tokens[index].decimals),
        }));
        return {
            nativeBalance: ethers_1.ethers.formatEther(nativeBalance),
            tokenBalances,
        };
    }
    catch (error) {
        console.error(`Failed to retrieve custodial wallet balances and tokens: ${error.message}`);
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
};
