"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Save deployed contract information",
    operationId: "saveDeployedContract",
    tags: ["NFT", "Smart Contract"],
    logModule: "NFT",
    logTitle: "Save deployed contract info",
    description: "Saves contract deployment information after user deploys via Web3",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        collectionId: { type: "string", format: "uuid" },
                        contractAddress: { type: "string" },
                        transactionHash: { type: "string" },
                        blockNumber: { type: "integer" },
                        gasUsed: { type: "string" },
                        deploymentCost: { type: "string" },
                        chain: { type: "string" }
                    },
                    required: ["collectionId", "contractAddress", "transactionHash", "blockNumber", "chain"]
                }
            }
        }
    },
    responses: {
        200: {
            description: "Contract deployment information saved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: { type: "object" }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        404: { description: "Collection not found" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true
};
exports.default = async (data) => {
    try {
        const { user, body, ctx } = data;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
        }
        const { collectionId, contractAddress, transactionHash, blockNumber, gasUsed, deploymentCost, chain } = body;
        if (!collectionId || !contractAddress || !transactionHash) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Missing required fields"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating collection ownership");
        const creator = await db_1.models.nftCreator.findOne({
            where: { userId: user.id }
        });
        if (!creator) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Creator profile not found"
            });
        }
        const collection = await db_1.models.nftCollection.findOne({
            where: {
                id: collectionId,
                creatorId: creator.id
            }
        });
        if (!collection) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Collection not found or access denied"
            });
        }
        if (collection.contractAddress && collection.contractAddress !== contractAddress) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Collection already has a different contract address"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving contract deployment information");
        await collection.update({
            contractAddress,
            status: "ACTIVE",
            network: chain.toLowerCase(),
            deployedAt: new Date()
        });
        await db_1.models.nftActivity.create({
            type: "COLLECTION_DEPLOYED",
            collectionId: collection.id,
            fromUserId: undefined,
            toUserId: user.id,
            transactionHash,
            blockNumber,
            metadata: JSON.stringify({
                contractAddress,
                chain,
                gasUsed,
                deploymentCost,
                deployer: user.id,
                standard: collection.standard
            })
        });
        const updatedCollection = await db_1.models.nftCollection.findByPk(collection.id, {
            include: [
                {
                    model: db_1.models.nftCreator,
                    as: "creator",
                    attributes: ["id", "displayName", "banner", "isVerified"],
                    include: [
                        {
                            model: db_1.models.user,
                            as: "user",
                            attributes: ["id", "firstName", "lastName", "avatar"]
                        }
                    ]
                },
                {
                    model: db_1.models.nftCategory,
                    as: "category",
                    attributes: ["id", "name", "slug"]
                }
            ]
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Contract deployment saved: ${contractAddress}`);
        return {
            message: "Contract deployment saved successfully",
            data: updatedCollection
        };
    }
    catch (error) {
        const { ctx } = data;
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to save contract deployment: ${error.message}`);
        console_1.logger.error("NFT", "Failed to save deployed contract information", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to save contract deployment"
        });
    }
};
