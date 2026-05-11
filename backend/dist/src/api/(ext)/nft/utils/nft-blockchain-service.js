"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NFTBlockchainService = void 0;
exports.getNFTBlockchainService = getNFTBlockchainService;
const gas_helper_1 = require("./gas-helper");
let getProvider;
let getAdjustedGasPrice;
let getSmartContract;
try {
    const providerModule = require("../../ecosystem/utils/provider");
    getProvider = providerModule.getProvider;
    const gasModule = require("../../ecosystem/utils/gas");
    getAdjustedGasPrice = gasModule.getAdjustedGasPrice;
    const contractModule = require("../../ecosystem/utils/smartContract");
    getSmartContract = contractModule.getSmartContract;
}
catch (e) {
}
const ethers_1 = require("ethers");
const db_1 = require("@b/db");
const encrypt_1 = require("@b/utils/encrypt");
const error_1 = require("@b/utils/error");
const gas_optimization_service_1 = require("./gas-optimization-service");
const console_1 = require("@b/utils/console");
class NFTBlockchainService {
    constructor(provider, signer, chain) {
        this.provider = provider;
        this.signer = signer;
        this.chain = chain;
        this.gasOptimizer = new gas_optimization_service_1.GasOptimizationService(provider, chain);
    }
    static async initialize(chain, masterWalletId) {
        try {
            if (!getProvider) {
                throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
            }
            const provider = await getProvider(chain);
            if (!provider) {
                throw (0, error_1.createError)({ statusCode: 503, message: "Provider not initialized" });
            }
            let masterWallet;
            if (masterWalletId) {
                masterWallet = await db_1.models.ecosystemMasterWallet.findByPk(masterWalletId);
            }
            else {
                masterWallet = await db_1.models.ecosystemMasterWallet.findOne({
                    where: { chain, status: true }
                });
            }
            if (!masterWallet) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Master wallet not found for the specified chain" });
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
            const signer = new ethers_1.ethers.Wallet(decryptedData.privateKey).connect(provider);
            return new NFTBlockchainService(provider, signer, chain);
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to initialize NFT blockchain service", error);
            throw error;
        }
    }
    async mintNFT(collectionId, toAddress, tokenURI) {
        try {
            const collection = await db_1.models.nftCollection.findByPk(collectionId);
            if (!collection) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Collection not found" });
            }
            if (!collection.contractAddress) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Collection contract not deployed" });
            }
            if (!getSmartContract) {
                throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available for smart contracts" });
            }
            const contractName = collection.standard === "ERC721" ? "ERC721NFT" : "ERC1155NFT";
            const { abi } = await getSmartContract("nft", contractName);
            const nftContract = new ethers_1.ethers.Contract(collection.contractAddress, abi, this.signer);
            const txType = {
                type: "nft_mint",
                baseGas: 150000,
                complexity: 1,
                hasRoyalty: false,
                isERC1155: collection.standard === "ERC1155",
                isBatch: false,
                dataSize: tokenURI ? tokenURI.length : 100
            };
            const gasEstimate = await this.gasOptimizer.estimateTransactionCost(txType, "standard");
            if (gasEstimate.optimizationSuggestions.length > 0) {
                console_1.logger.debug("NFT", `Gas optimization suggestions: ${JSON.stringify(gasEstimate.optimizationSuggestions)}`);
            }
            const txOptions = {
                gasLimit: gasEstimate.gasLimit,
            };
            if (gasEstimate.maxFeePerGas && gasEstimate.maxPriorityFeePerGas) {
                txOptions.maxFeePerGas = gasEstimate.maxFeePerGas;
                txOptions.maxPriorityFeePerGas = gasEstimate.maxPriorityFeePerGas;
            }
            else {
                txOptions.gasPrice = gasEstimate.gasPrice;
            }
            if (collection.mintPrice && collection.mintPrice > 0) {
                txOptions.value = ethers_1.ethers.parseUnits(collection.mintPrice.toString(), 18);
            }
            const tx = await nftContract.mint(toAddress, txOptions);
            const receipt = await tx.wait();
            if (!receipt) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Transaction receipt not found" });
            }
            let tokenId;
            const transferEventTopic = ethers_1.ethers.id("Transfer(address,address,uint256)");
            for (const log of receipt.logs) {
                if (log.topics[0] === transferEventTopic) {
                    tokenId = BigInt(log.topics[3]).toString();
                    break;
                }
            }
            const gasUsed = receipt.gasUsed;
            const actualGasPrice = tx.gasPrice || gasEstimate.gasPrice;
            const mintingCost = ethers_1.ethers.formatEther(gasUsed * actualGasPrice);
            return {
                success: true,
                tokenId,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: gasUsed.toString(),
                mintingCost,
                contractAddress: collection.contractAddress,
            };
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to mint NFT on blockchain", error);
            if (error.code === "INSUFFICIENT_FUNDS") {
                throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds in wallet to mint NFT" });
            }
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to mint NFT: ${error.message}` });
        }
    }
    async executePurchase(contractAddress, fromAddress, toAddress, tokenId, price, standard = "ERC721", marketplaceAddress) {
        try {
            if (!getSmartContract || !getAdjustedGasPrice) {
                throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available for smart contracts" });
            }
            const contractName = standard === "ERC721" ? "ERC721NFT" : "ERC1155NFT";
            const { abi } = await getSmartContract("nft", contractName);
            const nftContract = new ethers_1.ethers.Contract(contractAddress, abi, this.signer);
            const gasPrice = await (0, gas_helper_1.getGasPrice)(this.provider);
            let tx;
            if (standard === "ERC721") {
                const approved = await nftContract.getApproved(tokenId);
                const isApprovedForAll = await nftContract.isApprovedForAll(fromAddress, this.signer.address);
                if (approved.toLowerCase() !== this.signer.address.toLowerCase() && !isApprovedForAll) {
                    throw (0, error_1.createError)({ statusCode: 403, message: "Marketplace not approved to transfer this token" });
                }
                tx = await nftContract.safeTransferFrom(fromAddress, toAddress, tokenId, {
                    gasPrice,
                    gasLimit: 150000,
                });
            }
            else {
                const isApprovedForAll = await nftContract.isApprovedForAll(fromAddress, this.signer.address);
                if (!isApprovedForAll) {
                    throw (0, error_1.createError)({ statusCode: 403, message: "Marketplace not approved to transfer tokens from this owner" });
                }
                tx = await nftContract.safeTransferFrom(fromAddress, toAddress, tokenId, 1, "0x", {
                    gasPrice,
                    gasLimit: 200000,
                });
            }
            const receipt = await tx.wait();
            if (!receipt) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Transaction receipt not found" });
            }
            const gasUsed = receipt.gasUsed;
            const actualGasPrice = tx.gasPrice || gasPrice;
            const transferCost = ethers_1.ethers.formatEther(gasUsed * actualGasPrice);
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: gasUsed.toString(),
                transferCost,
            };
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to execute purchase transfer", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to execute purchase transfer: ${error.message}` });
        }
    }
    async transferNFT(contractAddress, fromAddress, toAddress, tokenId, standard = "ERC721") {
        try {
            if (!getSmartContract || !getAdjustedGasPrice) {
                throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available for smart contracts" });
            }
            const contractName = standard === "ERC721" ? "ERC721NFT" : "ERC1155NFT";
            const { abi } = await getSmartContract("nft", contractName);
            const nftContract = new ethers_1.ethers.Contract(contractAddress, abi, this.signer);
            const gasPrice = await (0, gas_helper_1.getGasPrice)(this.provider);
            let tx;
            if (standard === "ERC721") {
                tx = await nftContract.transferFrom(fromAddress, toAddress, tokenId, {
                    gasPrice,
                    gasLimit: 100000,
                });
            }
            else {
                tx = await nftContract.safeTransferFrom(fromAddress, toAddress, tokenId, 1, "0x", {
                    gasPrice,
                    gasLimit: 150000,
                });
            }
            const receipt = await tx.wait();
            if (!receipt) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Transaction receipt not found" });
            }
            const gasUsed = receipt.gasUsed;
            const actualGasPrice = tx.gasPrice || gasPrice;
            const transferCost = ethers_1.ethers.formatEther(gasUsed * actualGasPrice);
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: gasUsed.toString(),
                transferCost,
            };
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to transfer NFT", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to transfer NFT: ${error.message}` });
        }
    }
    async verifyTransaction(transactionHash) {
        try {
            const receipt = await this.provider.getTransactionReceipt(transactionHash);
            return receipt !== null && receipt.status === 1;
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to verify transaction", error);
            return false;
        }
    }
    async getContractBalance(contractAddress) {
        try {
            const balance = await this.provider.getBalance(contractAddress);
            return ethers_1.ethers.formatEther(balance);
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to get contract balance", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to get contract balance: ${error.message}` });
        }
    }
    async verifyTokenOwnership(contractAddress, tokenId, ownerAddress, standard = "ERC721") {
        try {
            if (!getSmartContract) {
                throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available for smart contracts" });
            }
            const contractName = standard === "ERC721" ? "ERC721NFT" : "ERC1155NFT";
            const { abi } = await getSmartContract("nft", contractName);
            const nftContract = new ethers_1.ethers.Contract(contractAddress, abi, this.provider);
            if (standard === "ERC721") {
                const owner = await nftContract.ownerOf(tokenId);
                return owner.toLowerCase() === ownerAddress.toLowerCase();
            }
            else {
                const balance = await nftContract.balanceOf(ownerAddress, tokenId);
                return balance > 0;
            }
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to verify token ownership", error);
            return false;
        }
    }
    async getTokenURI(contractAddress, tokenId, standard = "ERC721") {
        try {
            if (!getSmartContract) {
                throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available for smart contracts" });
            }
            const contractName = standard === "ERC721" ? "ERC721NFT" : "ERC1155NFT";
            const { abi } = await getSmartContract("nft", contractName);
            const nftContract = new ethers_1.ethers.Contract(contractAddress, abi, this.provider);
            if (standard === "ERC721") {
                return await nftContract.tokenURI(tokenId);
            }
            else {
                return await nftContract.uri(tokenId);
            }
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to get token URI", error);
            return null;
        }
    }
}
exports.NFTBlockchainService = NFTBlockchainService;
async function getNFTBlockchainService(chain, masterWalletId) {
    return NFTBlockchainService.initialize(chain, masterWalletId);
}
