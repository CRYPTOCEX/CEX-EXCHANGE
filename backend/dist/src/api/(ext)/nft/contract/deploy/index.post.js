"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const ethers_1 = require("ethers");
const gas_helper_1 = require("../../utils/gas-helper");
let getProvider;
let getAdjustedGasPrice;
let getSmartContract;
try {
    const providerModule = require("../../../ecosystem/utils/provider");
    getProvider = providerModule.getProvider;
}
catch (e) {
}
try {
    const gasModule = require("../../../ecosystem/utils/gas");
    getAdjustedGasPrice = gasModule.getAdjustedGasPrice;
}
catch (e) {
}
try {
    const smartContractModule = require("../../../ecosystem/utils/smartContract");
    getSmartContract = smartContractModule.getSmartContract;
}
catch (e) {
}
const encrypt_1 = require("@b/utils/encrypt");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Deploy NFT smart contract",
    operationId: "deployNftContract",
    tags: ["NFT", "Smart Contract"],
    logModule: "NFT",
    logTitle: "Deploy NFT contract",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        collectionId: { type: "string" },
                        chain: { type: "string", enum: ["ETH", "BSC", "POLYGON", "ARBITRUM", "OPTIMISM"] },
                        standard: { type: "string", enum: ["ERC721", "ERC1155"] },
                        name: { type: "string" },
                        symbol: { type: "string" },
                        baseURI: { type: "string" },
                        maxSupply: { type: "integer" },
                        royaltyPercentage: { type: "number" },
                        mintPrice: { type: "number" },
                        isPublicMint: { type: "boolean" }
                    },
                    required: ["collectionId", "chain", "standard", "name", "symbol"]
                }
            }
        }
    },
    responses: {
        200: {
            description: "Smart contract deployed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    contractAddress: { type: "string" },
                                    transactionHash: { type: "string" },
                                    blockNumber: { type: "integer" },
                                    gasUsed: { type: "integer" },
                                    deploymentCost: { type: "number" }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
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
        const { collectionId, chain, standard, name, symbol, baseURI, maxSupply, royaltyPercentage, mintPrice, isPublicMint } = body;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating collection ownership");
        const creator = await db_1.models.nftCreator.findOne({
            where: { userId: user.id }
        });
        if (!creator) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Creator profile not found. Please create NFTs first."
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
        if (collection.contractAddress) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Contract already deployed for this collection"
            });
        }
        if (royaltyPercentage && (royaltyPercentage < 0 || royaltyPercentage > 50)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Royalty percentage must be between 0% and 50%"
            });
        }
        if (maxSupply && maxSupply < 1) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Max supply must be at least 1"
            });
        }
        const masterWallet = await db_1.models.ecosystemMasterWallet.findOne({
            where: {
                chain,
                status: true
            }
        });
        if (!masterWallet) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Master wallet not found for the specified chain"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deploying smart contract to blockchain");
        const deploymentResult = await deployNftContract(masterWallet, chain, standard, name, symbol, baseURI || "", maxSupply || 0, Math.floor((royaltyPercentage || 0) * 100), user.walletAddress || masterWallet.address, mintPrice ? parseFloat(mintPrice.toString()) : 0, isPublicMint || false, user.walletAddress || masterWallet.address);
        if (!deploymentResult.success) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Contract deployment failed"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Recording deployment in database");
        await collection.update({
            contractAddress: deploymentResult.contractAddress,
            chain,
            standard,
            maxSupply,
            royaltyPercentage,
            mintPrice,
            status: "ACTIVE",
            deployedAt: new Date()
        });
        try {
            await db_1.models.nftActivity.create({
                collectionId,
                fromUserId: user.id,
                type: "COLLECTION_CREATED",
                transactionHash: deploymentResult.transactionHash,
                blockNumber: deploymentResult.blockNumber,
                metadata: {
                    action: "CONTRACT_DEPLOYMENT",
                    chain,
                    standard,
                    contractAddress: deploymentResult.contractAddress,
                    gasUsed: deploymentResult.gasUsed,
                    deploymentCost: deploymentResult.deploymentCost,
                    deploymentParams: {
                        name,
                        symbol,
                        baseURI: baseURI || "",
                        maxSupply: maxSupply || 0,
                        royaltyPercentage: Math.floor((royaltyPercentage || 0) * 100),
                        mintPrice: mintPrice ? parseFloat(mintPrice.toString()) : 0,
                        isPublicMint: isPublicMint || false
                    }
                }
            });
        }
        catch (activityError) {
            console_1.logger.error("NFT_CONTRACT_DEPLOY", "Failed to record deployment activity", activityError);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Contract deployed successfully: ${deploymentResult.contractAddress}`);
        return {
            message: "Smart contract deployed successfully",
            data: {
                contractAddress: deploymentResult.contractAddress,
                transactionHash: deploymentResult.transactionHash,
                blockNumber: deploymentResult.blockNumber,
                gasUsed: deploymentResult.gasUsed,
                deploymentCost: deploymentResult.deploymentCost
            }
        };
    }
    catch (error) {
        const { ctx } = data;
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to deploy contract: ${error.message}`);
        console_1.logger.error("NFT_CONTRACT_DEPLOY", "Failed to deploy smart contract", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to deploy smart contract"
        });
    }
};
async function deployNftContract(masterWallet, chain, standard, name, symbol, baseURI, maxSupply, royaltyPercentage, royaltyRecipient, mintPrice, isPublicMint, owner) {
    try {
        const provider = await getProvider(chain);
        if (!provider) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Provider not initialized" });
        }
        if (!masterWallet.data) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Master wallet data not found" });
        }
        let decryptedData;
        try {
            decryptedData = JSON.parse((0, encrypt_1.decrypt)(masterWallet.data));
        }
        catch (error) {
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to decrypt master wallet data: ${error.message}` });
        }
        if (!decryptedData || !decryptedData.privateKey) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Decrypted data or private key not found" });
        }
        const { privateKey } = decryptedData;
        const signer = new ethers_1.ethers.Wallet(privateKey).connect(provider);
        const contractName = standard === "ERC721" ? "ERC721NFT" : "ERC1155NFT";
        const { abi, bytecode } = await getSmartContract("nft", contractName);
        if (!abi || !bytecode) {
            throw (0, error_1.createError)({ statusCode: 500, message: `Smart contract ABI or Bytecode not found for ${contractName}` });
        }
        const nftFactory = new ethers_1.ContractFactory(abi, bytecode, signer);
        const mintPriceWei = mintPrice > 0 ? ethers_1.ethers.parseUnits(mintPrice.toString(), 18) : 0;
        const adjustedGasPrice = await (0, gas_helper_1.getGasPrice)(provider);
        const nftContract = await nftFactory.deploy(name, symbol, baseURI, maxSupply, royaltyPercentage, royaltyRecipient, mintPriceWei, isPublicMint, owner, {
            gasPrice: adjustedGasPrice,
            gasLimit: 5000000
        });
        const response = await nftContract.waitForDeployment();
        const contractAddress = await response.getAddress();
        const deploymentTx = nftContract.deploymentTransaction();
        if (!deploymentTx) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Deployment transaction not found" });
        }
        const receipt = await deploymentTx.wait();
        if (!receipt) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Transaction receipt not found" });
        }
        const gasUsed = receipt.gasUsed;
        const gasPrice = deploymentTx.gasPrice || BigInt(0);
        const deploymentCost = ethers_1.ethers.formatEther(gasUsed * gasPrice);
        return {
            success: true,
            contractAddress,
            transactionHash: deploymentTx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: gasUsed.toString(),
            deploymentCost
        };
    }
    catch (error) {
        console_1.logger.error("NFT_CONTRACT_DEPLOY", "Contract deployment failed", error);
        if ((0, ethers_1.isError)(error, "INSUFFICIENT_FUNDS")) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds in master wallet to deploy contract" });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to deploy NFT contract: ${error.message}` });
    }
}
