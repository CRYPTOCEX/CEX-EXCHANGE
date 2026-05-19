"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NFTApprovalService = void 0;
const ethers_1 = require("ethers");
const db_1 = require("@b/db");
const nft_blockchain_service_1 = require("./nft-blockchain-service");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
let getSmartContract;
try {
    const smartContractModule = require("../../ecosystem/utils/smartContract");
    getSmartContract = smartContractModule.getSmartContract;
}
catch (e) {
}
class NFTApprovalService {
    static async checkTokenApproval(contractAddress, tokenId, ownerAddress, marketplaceAddress, chain, standard = "ERC721") {
        try {
            const blockchainService = await (0, nft_blockchain_service_1.getNFTBlockchainService)(chain);
            const provider = blockchainService.provider;
            const contractName = standard === "ERC721" ? "ERC721NFT" : "ERC1155NFT";
            const { abi } = await getSmartContract("nft", contractName);
            const nftContract = new ethers_1.ethers.Contract(contractAddress, abi, provider);
            if (standard === "ERC721") {
                const BLOCKCHAIN_TIMEOUT = 3000;
                const createTimeout = () => new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("Blockchain call timeout")), BLOCKCHAIN_TIMEOUT);
                });
                const approvedOperator = await Promise.race([
                    nftContract.getApproved(tokenId),
                    createTimeout()
                ]).catch((err) => {
                    console_1.logger.debug("NFT", `getApproved timeout/error: ${err.message}`);
                    return ethers_1.ethers.ZeroAddress;
                });
                const isSpecificallyApproved = approvedOperator.toLowerCase() === marketplaceAddress.toLowerCase();
                const isApprovedForAll = await Promise.race([
                    nftContract.isApprovedForAll(ownerAddress, marketplaceAddress),
                    createTimeout()
                ]).catch((err) => {
                    console_1.logger.debug("NFT", `isApprovedForAll timeout/error: ${err.message}`);
                    return true;
                });
                const actualOwner = await Promise.race([
                    nftContract.ownerOf(tokenId),
                    createTimeout()
                ]).catch((err) => {
                    console_1.logger.debug("NFT", `ownerOf timeout/error: ${err.message}`);
                    return ownerAddress;
                });
                const isOwner = actualOwner.toLowerCase() === ownerAddress.toLowerCase();
                if (!isOwner) {
                    return {
                        isApproved: false,
                        requiresApproval: true,
                        tokenOwner: actualOwner.toLowerCase(),
                        marketplaceContract: marketplaceAddress,
                        errorMessage: `Token owner mismatch. Expected: ${ownerAddress}, Actual: ${actualOwner}`
                    };
                }
                return {
                    isApproved: isSpecificallyApproved || isApprovedForAll,
                    approvedOperator: isSpecificallyApproved ? approvedOperator : (isApprovedForAll ? marketplaceAddress : ""),
                    requiresApproval: !(isSpecificallyApproved || isApprovedForAll),
                    tokenOwner: actualOwner.toLowerCase(),
                    marketplaceContract: marketplaceAddress
                };
            }
            else {
                const isApprovedForAll = await nftContract.isApprovedForAll(ownerAddress, marketplaceAddress);
                const balance = await nftContract.balanceOf(ownerAddress, tokenId);
                const hasTokens = balance > 0;
                if (!hasTokens) {
                    return {
                        isApproved: false,
                        requiresApproval: true,
                        tokenOwner: ownerAddress,
                        marketplaceContract: marketplaceAddress,
                        errorMessage: `User does not own any tokens with ID ${tokenId}`
                    };
                }
                return {
                    isApproved: isApprovedForAll,
                    approvedOperator: isApprovedForAll ? marketplaceAddress : "",
                    requiresApproval: !isApprovedForAll,
                    tokenOwner: ownerAddress,
                    marketplaceContract: marketplaceAddress
                };
            }
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to check token approval", error);
            return {
                isApproved: false,
                requiresApproval: true,
                errorMessage: `Failed to check approval: ${error.message}`
            };
        }
    }
    static async verifyApprovalTransaction(data) {
        var _a;
        try {
            const blockchainService = await (0, nft_blockchain_service_1.getNFTBlockchainService)(data.chain);
            const provider = blockchainService.provider;
            const receipt = await provider.getTransactionReceipt(data.transactionHash);
            if (!receipt || receipt.status !== 1) {
                return false;
            }
            const tx = await provider.getTransaction(data.transactionHash);
            if (!tx) {
                return false;
            }
            if (((_a = tx.to) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== data.contractAddress.toLowerCase()) {
                return false;
            }
            const contractName = data.standard === "ERC721" ? "ERC721NFT" : "ERC1155NFT";
            const { abi } = await getSmartContract("nft", contractName);
            const contractInterface = new ethers_1.ethers.Interface(abi);
            try {
                const parsedTx = contractInterface.parseTransaction({
                    data: tx.data,
                    value: tx.value
                });
                if (!parsedTx) {
                    return false;
                }
                const validApprovalFunctions = ['approve', 'setApprovalForAll'];
                if (!validApprovalFunctions.includes(parsedTx.name)) {
                    return false;
                }
                if (parsedTx.name === 'approve' && data.standard === "ERC721") {
                    const [approvedOperator, tokenIdFromTx] = parsedTx.args;
                    return (approvedOperator.toLowerCase() === data.marketplaceAddress.toLowerCase() &&
                        tokenIdFromTx.toString() === data.tokenId);
                }
                if (parsedTx.name === 'setApprovalForAll') {
                    const [operator, approved] = parsedTx.args;
                    return (operator.toLowerCase() === data.marketplaceAddress.toLowerCase() &&
                        approved === true);
                }
                return true;
            }
            catch (parseError) {
                console_1.logger.error("NFT", "Failed to parse approval transaction", parseError);
                return false;
            }
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to verify approval transaction", error);
            return false;
        }
    }
    static async getMarketplaceContractAddress(chain) {
        try {
            if (db_1.models.nftMarketplace) {
                const marketplace = await db_1.models.nftMarketplace.findOne({
                    where: {
                        chain: chain.toUpperCase(),
                        status: "ACTIVE"
                    },
                    order: [["createdAt", "DESC"]]
                });
                if (marketplace && marketplace.contractAddress) {
                    return marketplace.contractAddress;
                }
            }
            return null;
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to get marketplace contract address", error);
            return null;
        }
    }
    static async validateTokenApproval(tokenId, userId, operationType = "list", skipBlockchainCheck = false) {
        var _a;
        try {
            const token = await db_1.models.nftToken.findOne({
                where: { id: tokenId },
                include: [
                    {
                        model: db_1.models.nftCollection,
                        as: "collection",
                        attributes: ["id", "contractAddress", "chain", "standard"],
                        required: false
                    }
                ]
            });
            if (!token) {
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: "Token not found"
                });
            }
            if (token.ownerId !== userId) {
                throw (0, error_1.createError)({
                    statusCode: 403,
                    message: "User does not own this token"
                });
            }
            if (!token.ownerWalletAddress) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "NFT must have an owner wallet address. Please mint the NFT on blockchain first."
                });
            }
            if (!token.isMinted || !token.tokenId) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Token must be minted on blockchain before marketplace operations"
                });
            }
            if (!((_a = token.collection) === null || _a === void 0 ? void 0 : _a.contractAddress)) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Collection contract must be deployed before marketplace operations"
                });
            }
            const marketplaceAddress = await this.getMarketplaceContractAddress(token.collection.chain);
            if (!marketplaceAddress) {
                console_1.logger.info("NFT", `No marketplace contract found for ${token.collection.chain}, skipping blockchain approval check`);
                return;
            }
            if (skipBlockchainCheck) {
                console_1.logger.info("NFT", `Skipping blockchain approval check for ${operationType} operation (frontend verified)`);
                return;
            }
            const approvalStatus = await this.checkTokenApproval(token.collection.contractAddress, token.tokenId.toString(), token.ownerWalletAddress, marketplaceAddress, token.collection.chain, token.collection.standard);
            if (!approvalStatus.isApproved) {
                const errorMessage = approvalStatus.errorMessage ||
                    `Token ${token.tokenId} is not approved for marketplace operations. ` +
                        `Please approve the marketplace contract ${marketplaceAddress} to transfer your NFT.`;
                throw (0, error_1.createError)({
                    statusCode: 403,
                    message: errorMessage
                });
            }
        }
        catch (error) {
            if (error.statusCode) {
                throw error;
            }
            console_1.logger.error("NFT", "Failed to validate token approval", error);
            throw (0, error_1.createError)({
                statusCode: 500,
                message: `Failed to validate token approval: ${error.message}`
            });
        }
    }
    static async checkBatchApproval(tokenIds, userId) {
        var _a, _b;
        const results = {};
        for (const tokenId of tokenIds) {
            try {
                const token = await db_1.models.nftToken.findOne({
                    where: { id: tokenId, ownerId: userId },
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["contractAddress", "chain", "standard"]
                        }
                    ]
                });
                if (!token || !((_a = token.collection) === null || _a === void 0 ? void 0 : _a.contractAddress) || !token.ownerWalletAddress) {
                    results[tokenId] = {
                        isApproved: false,
                        requiresApproval: true,
                        errorMessage: "Token not found or missing required data"
                    };
                    continue;
                }
                const marketplaceAddress = await this.getMarketplaceContractAddress(token.collection.chain);
                if (!marketplaceAddress) {
                    results[tokenId] = {
                        isApproved: false,
                        requiresApproval: false,
                        errorMessage: "No marketplace contract deployed for this chain"
                    };
                    continue;
                }
                results[tokenId] = await this.checkTokenApproval(token.collection.contractAddress, ((_b = token.tokenId) === null || _b === void 0 ? void 0 : _b.toString()) || tokenId, token.ownerWalletAddress, marketplaceAddress, token.collection.chain, token.collection.standard);
            }
            catch (error) {
                results[tokenId] = {
                    isApproved: false,
                    requiresApproval: true,
                    errorMessage: `Error checking approval: ${error.message}`
                };
            }
        }
        return results;
    }
}
exports.NFTApprovalService = NFTApprovalService;
