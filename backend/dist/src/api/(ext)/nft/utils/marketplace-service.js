"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NFTMarketplaceService = void 0;
exports.getNFTMarketplaceService = getNFTMarketplaceService;
const ethers_1 = require("ethers");
const db_1 = require("@b/db");
const encrypt_1 = require("@b/utils/encrypt");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const gas_helper_1 = require("./gas-helper");
let getProvider;
let getAdjustedGasPrice;
let getSmartContract;
try {
    const providerModule = require("../../ecosystem/utils/provider");
    getProvider = providerModule.getProvider;
}
catch (e) {
}
try {
    const gasModule = require("../../ecosystem/utils/gas");
    getAdjustedGasPrice = gasModule.getAdjustedGasPrice;
}
catch (e) {
}
try {
    const smartContractModule = require("../../ecosystem/utils/smartContract");
    getSmartContract = smartContractModule.getSmartContract;
}
catch (e) {
}
class NFTMarketplaceService {
    constructor(provider, signer, chain) {
        this.provider = provider;
        this.signer = signer;
        this.chain = chain;
    }
    async getGasPrice() {
        return await (0, gas_helper_1.getGasPrice)(this.provider);
    }
    static async initialize(chain, masterWalletId) {
        try {
            const provider = await getProvider(chain);
            if (!provider) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Provider not initialized" });
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
            return new NFTMarketplaceService(provider, signer, chain);
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to initialize marketplace service", error);
            throw error;
        }
    }
    setMarketplaceAddress(address) {
        this.marketplaceAddress = address;
        this.marketplaceContract = undefined;
    }
    async getMarketplaceContract() {
        if (!this.marketplaceContract || !this.marketplaceAddress) {
            const marketplace = await db_1.models.nftMarketplace.findOne({
                where: {
                    chain: this.chain.toUpperCase(),
                    status: "ACTIVE"
                },
                order: [["createdAt", "DESC"]]
            });
            if (!marketplace) {
                throw (0, error_1.createError)({ statusCode: 404, message: `No active marketplace contract deployed for ${this.chain}. Please deploy marketplace contract first.` });
            }
            this.marketplaceAddress = marketplace.contractAddress;
            const { abi } = await getSmartContract("nft", "NFTMarketplace");
            if (!this.marketplaceAddress) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Marketplace address not set" });
            }
            this.marketplaceContract = new ethers_1.Contract(this.marketplaceAddress, abi, this.signer);
        }
        return this.marketplaceContract;
    }
    async deployMarketplace(feeRecipient, feePercentage = 250, deployedBy, network = "mainnet", listingFee = 0, maxRoyaltyPercentage = 10) {
        var _a, _b, _c, _d;
        try {
            if (!getSmartContract) {
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "Ecosystem extension is required for NFT marketplace deployment",
                });
            }
            const { abi, bytecode } = await getSmartContract("nft", "NFTMarketplace");
            const marketplaceFactory = new ethers_1.ethers.ContractFactory(abi, bytecode, this.signer);
            const gasPrice = await this.getGasPrice();
            const deploymentTx = await marketplaceFactory.deploy(feeRecipient, feePercentage, {
                gasPrice,
                gasLimit: 4000000,
            });
            const receipt = await deploymentTx.waitForDeployment();
            const deploymentReceipt = await ((_a = deploymentTx.deploymentTransaction()) === null || _a === void 0 ? void 0 : _a.wait());
            if (!deploymentReceipt) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Deployment receipt not found" });
            }
            const contractAddress = await deploymentTx.getAddress();
            const gasUsed = deploymentReceipt.gasUsed;
            const actualGasPrice = ((_b = deploymentTx.deploymentTransaction()) === null || _b === void 0 ? void 0 : _b.gasPrice) || gasPrice;
            const deploymentCost = ethers_1.ethers.formatEther(gasUsed * actualGasPrice);
            const deployerAddress = await this.signer.getAddress();
            await db_1.models.nftMarketplace.update({ status: "DEPRECATED" }, {
                where: {
                    chain: this.chain.toUpperCase(),
                    network,
                    status: "ACTIVE"
                }
            });
            await db_1.models.nftMarketplace.create({
                chain: this.chain.toUpperCase(),
                network,
                contractAddress,
                deployerAddress,
                deployedBy,
                feeRecipient,
                feePercentage: feePercentage / 100,
                listingFee,
                maxRoyaltyPercentage,
                transactionHash: ((_c = deploymentTx.deploymentTransaction()) === null || _c === void 0 ? void 0 : _c.hash) || "",
                blockNumber: deploymentReceipt.blockNumber,
                gasUsed: gasUsed.toString(),
                deploymentCost,
                status: "ACTIVE",
                version: "1.0.0"
            });
            this.setMarketplaceAddress(contractAddress);
            return {
                success: true,
                contractAddress,
                transactionHash: (_d = deploymentTx.deploymentTransaction()) === null || _d === void 0 ? void 0 : _d.hash,
                blockNumber: deploymentReceipt.blockNumber,
                gasUsed: gasUsed.toString(),
                deploymentCost,
            };
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to deploy marketplace contract", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to deploy marketplace contract: ${error.message}` });
        }
    }
    async listItem(nftContractAddress, tokenId, price, royaltyPercentage = 0, royaltyRecipient) {
        try {
            const marketplace = await this.getMarketplaceContract();
            const priceWei = ethers_1.ethers.parseUnits(price, 18);
            const finalRoyaltyRecipient = royaltyRecipient || this.signer.address;
            const gasPrice = await this.getGasPrice();
            const tx = await marketplace.listItem(nftContractAddress, tokenId, priceWei, royaltyPercentage * 100, finalRoyaltyRecipient, {
                gasPrice,
                gasLimit: 300000,
            });
            const receipt = await tx.wait();
            if (!receipt) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Transaction receipt not found" });
            }
            const gasUsed = receipt.gasUsed;
            const actualGasPrice = tx.gasPrice || gasPrice;
            const listingCost = ethers_1.ethers.formatEther(gasUsed * actualGasPrice);
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: gasUsed.toString(),
                listingCost,
            };
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to list item on marketplace", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to list item on marketplace: ${error.message}` });
        }
    }
    async buyItem(nftContractAddress, tokenId, paymentAmount) {
        try {
            const marketplace = await this.getMarketplaceContract();
            const listing = await this.getListing(nftContractAddress, tokenId);
            if (!listing.active) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Item is not listed for sale" });
            }
            const expectedPrice = ethers_1.ethers.parseUnits(listing.price, 18);
            const paymentWei = ethers_1.ethers.parseUnits(paymentAmount, 18);
            if (paymentWei !== expectedPrice) {
                throw (0, error_1.createError)({ statusCode: 400, message: `Payment amount (${paymentAmount}) does not match listing price (${listing.price})` });
            }
            const gasPrice = await this.getGasPrice();
            const tx = await marketplace.buyItem(nftContractAddress, tokenId, {
                value: paymentWei,
                gasPrice,
                gasLimit: 400000,
            });
            const receipt = await tx.wait();
            if (!receipt) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Transaction receipt not found" });
            }
            const feeCalculation = await this.calculateFees(listing.price, listing.royaltyPercentage);
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                marketplaceFee: feeCalculation.marketplaceFee,
                royaltyFee: feeCalculation.royaltyFee,
                sellerAmount: feeCalculation.sellerAmount,
            };
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to buy item from marketplace", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to buy item from marketplace: ${error.message}` });
        }
    }
    async cancelListing(nftContractAddress, tokenId) {
        try {
            const marketplace = await this.getMarketplaceContract();
            const gasPrice = await this.getGasPrice();
            const tx = await marketplace.cancelListing(nftContractAddress, tokenId, {
                gasPrice,
                gasLimit: 150000,
            });
            const receipt = await tx.wait();
            if (!receipt) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Transaction receipt not found" });
            }
            const gasUsed = receipt.gasUsed;
            const actualGasPrice = tx.gasPrice || gasPrice;
            const listingCost = ethers_1.ethers.formatEther(gasUsed * actualGasPrice);
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: gasUsed.toString(),
                listingCost,
            };
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to cancel listing", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to cancel listing: ${error.message}` });
        }
    }
    async updatePrice(nftContractAddress, tokenId, newPrice) {
        try {
            const marketplace = await this.getMarketplaceContract();
            const priceWei = ethers_1.ethers.parseUnits(newPrice, 18);
            const gasPrice = await this.getGasPrice();
            const tx = await marketplace.updatePrice(nftContractAddress, tokenId, priceWei, {
                gasPrice,
                gasLimit: 100000,
            });
            const receipt = await tx.wait();
            if (!receipt) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Transaction receipt not found" });
            }
            const gasUsed = receipt.gasUsed;
            const actualGasPrice = tx.gasPrice || gasPrice;
            const listingCost = ethers_1.ethers.formatEther(gasUsed * actualGasPrice);
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: gasUsed.toString(),
                listingCost,
            };
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to update listing price", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to update listing price: ${error.message}` });
        }
    }
    async getListing(nftContractAddress, tokenId) {
        try {
            const marketplace = await this.getMarketplaceContract();
            const [seller, price, active, royaltyPercentage, royaltyRecipient] = await marketplace.getListing(nftContractAddress, tokenId);
            return {
                seller: seller.toString(),
                price: ethers_1.ethers.formatEther(price),
                active,
                royaltyPercentage: Number(royaltyPercentage) / 100,
                royaltyRecipient: royaltyRecipient.toString(),
            };
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to get listing details", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to get listing details: ${error.message}` });
        }
    }
    async isListed(nftContractAddress, tokenId) {
        try {
            const marketplace = await this.getMarketplaceContract();
            return await marketplace.isListed(nftContractAddress, tokenId);
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to check if item is listed", error);
            return false;
        }
    }
    async calculateFees(price, royaltyPercentage) {
        try {
            const marketplace = await this.getMarketplaceContract();
            const priceWei = ethers_1.ethers.parseUnits(price, 18);
            const royaltyBasisPoints = royaltyPercentage * 100;
            const [marketplaceFeeWei, royaltyFeeWei, sellerAmountWei] = await marketplace.calculateFees(priceWei, royaltyBasisPoints);
            return {
                marketplaceFee: ethers_1.ethers.formatEther(marketplaceFeeWei),
                royaltyFee: ethers_1.ethers.formatEther(royaltyFeeWei),
                sellerAmount: ethers_1.ethers.formatEther(sellerAmountWei),
            };
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to calculate fees", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to calculate fees: ${error.message}` });
        }
    }
    async getMarketplaceAddress() {
        if (!this.marketplaceAddress) {
            await this.getMarketplaceContract();
        }
        return this.marketplaceAddress;
    }
    async getFeePercentage() {
        try {
            const marketplace = await this.getMarketplaceContract();
            const feePercentage = await marketplace.feePercentage();
            return Number(feePercentage) / 100;
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to get marketplace fee percentage", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to get marketplace fee percentage: ${error.message}` });
        }
    }
    async getFeeRecipient() {
        try {
            const marketplace = await this.getMarketplaceContract();
            return await marketplace.feeRecipient();
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to get marketplace fee recipient", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to get marketplace fee recipient: ${error.message}` });
        }
    }
    async updateFeePercentage(newFeePercentage) {
        var _a;
        try {
            const marketplace = await this.getMarketplaceContract();
            const basisPoints = Math.round(newFeePercentage * 100);
            const tx = await marketplace.updateFeePercentage(basisPoints);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt === null || receipt === void 0 ? void 0 : receipt.blockNumber,
                gasUsed: (_a = receipt === null || receipt === void 0 ? void 0 : receipt.gasUsed) === null || _a === void 0 ? void 0 : _a.toString(),
                gasFee: (receipt === null || receipt === void 0 ? void 0 : receipt.gasUsed) && (receipt === null || receipt === void 0 ? void 0 : receipt.gasPrice) ? (receipt.gasUsed * receipt.gasPrice).toString() : undefined
            };
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to update marketplace fee percentage", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to update marketplace fee percentage: ${error.message}` });
        }
    }
    async updateFeeRecipient(newRecipient) {
        var _a;
        try {
            const marketplace = await this.getMarketplaceContract();
            const tx = await marketplace.updateFeeRecipient(newRecipient);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt === null || receipt === void 0 ? void 0 : receipt.blockNumber,
                gasUsed: (_a = receipt === null || receipt === void 0 ? void 0 : receipt.gasUsed) === null || _a === void 0 ? void 0 : _a.toString(),
                gasFee: (receipt === null || receipt === void 0 ? void 0 : receipt.gasUsed) && (receipt === null || receipt === void 0 ? void 0 : receipt.gasPrice) ? (receipt.gasUsed * receipt.gasPrice).toString() : undefined
            };
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to update marketplace fee recipient", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to update marketplace fee recipient: ${error.message}` });
        }
    }
    async getContractBalance() {
        try {
            const provider = await getProvider(this.chain);
            const balance = await provider.getBalance(this.marketplaceAddress);
            return balance.toString();
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to get marketplace contract balance", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to get marketplace contract balance: ${error.message}` });
        }
    }
    async withdrawBalance(amount, recipient) {
        var _a;
        try {
            const marketplace = await this.getMarketplaceContract();
            const tx = await marketplace.withdraw(amount, recipient);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt === null || receipt === void 0 ? void 0 : receipt.blockNumber,
                gasUsed: (_a = receipt === null || receipt === void 0 ? void 0 : receipt.gasUsed) === null || _a === void 0 ? void 0 : _a.toString(),
                gasFee: (receipt === null || receipt === void 0 ? void 0 : receipt.gasUsed) && (receipt === null || receipt === void 0 ? void 0 : receipt.gasPrice) ? (receipt.gasUsed * receipt.gasPrice).toString() : undefined
            };
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to withdraw from marketplace contract", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to withdraw from marketplace contract: ${error.message}` });
        }
    }
    async pauseMarketplace() {
        var _a;
        try {
            const marketplace = await this.getMarketplaceContract();
            const hasPauseFunction = marketplace.interface.getFunction("pause") !== null;
            if (!hasPauseFunction) {
                return {
                    success: false,
                    message: "Marketplace contract does not support pausing. Consider deploying a new contract with Pausable functionality."
                };
            }
            const tx = await marketplace.pause();
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt === null || receipt === void 0 ? void 0 : receipt.blockNumber,
                gasUsed: (_a = receipt === null || receipt === void 0 ? void 0 : receipt.gasUsed) === null || _a === void 0 ? void 0 : _a.toString(),
                gasFee: (receipt === null || receipt === void 0 ? void 0 : receipt.gasUsed) && (receipt === null || receipt === void 0 ? void 0 : receipt.gasPrice) ? (receipt.gasUsed * receipt.gasPrice).toString() : undefined
            };
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to pause marketplace", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to pause marketplace: ${error.message}` });
        }
    }
    async unpauseMarketplace() {
        var _a;
        try {
            const marketplace = await this.getMarketplaceContract();
            const hasUnpauseFunction = marketplace.interface.getFunction("unpause") !== null;
            if (!hasUnpauseFunction) {
                return {
                    success: false,
                    message: "Marketplace contract does not support unpausing. Consider deploying a new contract with Pausable functionality."
                };
            }
            const tx = await marketplace.unpause();
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt === null || receipt === void 0 ? void 0 : receipt.blockNumber,
                gasUsed: (_a = receipt === null || receipt === void 0 ? void 0 : receipt.gasUsed) === null || _a === void 0 ? void 0 : _a.toString(),
                gasFee: (receipt === null || receipt === void 0 ? void 0 : receipt.gasUsed) && (receipt === null || receipt === void 0 ? void 0 : receipt.gasPrice) ? (receipt.gasUsed * receipt.gasPrice).toString() : undefined
            };
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to unpause marketplace", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to unpause marketplace: ${error.message}` });
        }
    }
    async isPaused() {
        try {
            const marketplace = await this.getMarketplaceContract();
            const hasPausedFunction = marketplace.interface.getFunction("paused") !== null;
            if (!hasPausedFunction) {
                return false;
            }
            const paused = await marketplace.paused();
            return paused;
        }
        catch (error) {
            return false;
        }
    }
    async updateSupportedTokenStandard(standards) {
        var _a;
        try {
            const marketplace = await this.getMarketplaceContract();
            const tx = await marketplace.updateSupportedStandards(standards);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt === null || receipt === void 0 ? void 0 : receipt.blockNumber,
                gasUsed: (_a = receipt === null || receipt === void 0 ? void 0 : receipt.gasUsed) === null || _a === void 0 ? void 0 : _a.toString(),
                gasFee: (receipt === null || receipt === void 0 ? void 0 : receipt.gasUsed) && (receipt === null || receipt === void 0 ? void 0 : receipt.gasPrice) ? (receipt.gasUsed * receipt.gasPrice).toString() : undefined
            };
        }
        catch (error) {
            console_1.logger.error("NFT_MARKETPLACE", "Failed to update supported token standards", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to update supported token standards: ${error.message}` });
        }
    }
}
exports.NFTMarketplaceService = NFTMarketplaceService;
async function getNFTMarketplaceService(chain, masterWalletId) {
    return NFTMarketplaceService.initialize(chain, masterWalletId);
}
