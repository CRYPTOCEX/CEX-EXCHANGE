"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NFTAuctionService = void 0;
exports.getNFTAuctionService = getNFTAuctionService;
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
class NFTAuctionService {
    constructor(provider, signer, chain) {
        this.provider = provider;
        this.signer = signer;
        this.chain = chain;
    }
    static async initialize(chain, masterWalletId) {
        try {
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
            return new NFTAuctionService(provider, signer, chain);
        }
        catch (error) {
            console_1.logger.error("AUCTION_SERVICE", "Failed to initialize auction service", error);
            throw error;
        }
    }
    async deployAuction(nftContractAddress, tokenId, startingBid, reservePrice, minBidIncrement, auctionEndTime, sellerAddress, marketplaceFeePercent = 2.5, royaltyFeePercent = 0, royaltyRecipient) {
        var _a, _b, _c;
        try {
            const { abi, bytecode } = await getSmartContract("nft", "NFTAuction");
            const auctionFactory = new ethers_1.ContractFactory(abi, bytecode, this.signer);
            const marketplaceFee = Math.floor(marketplaceFeePercent * 100);
            const royaltyFee = Math.floor(royaltyFeePercent * 100);
            const gasPrice = await (0, gas_helper_1.getGasPrice)(this.provider);
            const deploymentTx = await auctionFactory.deploy(nftContractAddress, tokenId, ethers_1.ethers.parseUnits(startingBid, 18), ethers_1.ethers.parseUnits(reservePrice, 18), ethers_1.ethers.parseUnits(minBidIncrement, 18), auctionEndTime, sellerAddress, marketplaceFee, royaltyFee, royaltyRecipient || sellerAddress, {
                gasPrice,
                gasLimit: 3000000,
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
            return {
                success: true,
                contractAddress,
                transactionHash: (_c = deploymentTx.deploymentTransaction()) === null || _c === void 0 ? void 0 : _c.hash,
                blockNumber: deploymentReceipt.blockNumber,
                gasUsed: gasUsed.toString(),
                deploymentCost,
            };
        }
        catch (error) {
            console_1.logger.error("AUCTION_SERVICE", "Failed to deploy auction contract", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to deploy auction contract: ${error.message}` });
        }
    }
    async placeBid(auctionContractAddress, bidAmount, bidderAddress) {
        try {
            const { abi } = await getSmartContract("nft", "NFTAuction");
            const auctionContract = new ethers_1.ethers.Contract(auctionContractAddress, abi, this.signer);
            const auctionInfo = await this.getAuctionInfo(auctionContractAddress);
            if (auctionInfo.ended || auctionInfo.auctionEndTime <= Math.floor(Date.now() / 1000)) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Auction has ended" });
            }
            const bidAmountWei = ethers_1.ethers.parseUnits(bidAmount, 18);
            const currentHighestBid = ethers_1.ethers.parseUnits(auctionInfo.highestBid, 18);
            const minBidIncrement = ethers_1.ethers.parseUnits(auctionInfo.minBidIncrement, 18);
            if (bidAmountWei <= currentHighestBid + minBidIncrement) {
                throw (0, error_1.createError)({ statusCode: 400, message: `Bid must be at least ${ethers_1.ethers.formatEther(currentHighestBid + minBidIncrement)} ETH` });
            }
            const gasPrice = await (0, gas_helper_1.getGasPrice)(this.provider);
            const tx = await auctionContract.bid({
                value: bidAmountWei,
                gasPrice,
                gasLimit: 300000,
            });
            const receipt = await tx.wait();
            if (!receipt) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Transaction receipt not found" });
            }
            const gasUsed = receipt.gasUsed;
            const actualGasPrice = tx.gasPrice || gasPrice;
            const bidCost = ethers_1.ethers.formatEther(gasUsed * actualGasPrice);
            const updatedAuctionInfo = await this.getAuctionInfo(auctionContractAddress);
            const isHighestBid = updatedAuctionInfo.highestBidder.toLowerCase() === bidderAddress.toLowerCase();
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: gasUsed.toString(),
                bidAmount,
                isHighestBid,
                previousBidRefunded: currentHighestBid > BigInt(0),
            };
        }
        catch (error) {
            console_1.logger.error("AUCTION_SERVICE", "Failed to place bid", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to place bid: ${error.message}` });
        }
    }
    async getAuctionInfo(auctionContractAddress) {
        try {
            const { abi } = await getSmartContract("nft", "NFTAuction");
            const auctionContract = new ethers_1.ethers.Contract(auctionContractAddress, abi, this.provider);
            const [nftContract, tokenId, highestBid, highestBidder, auctionEndTime, ended] = await auctionContract.getAuctionInfo();
            const seller = await auctionContract.seller();
            const reservePrice = await auctionContract.reservePrice();
            const minBidIncrement = await auctionContract.minBidIncrement();
            return {
                nftContract: nftContract.toString(),
                tokenId: tokenId.toString(),
                highestBid: ethers_1.ethers.formatEther(highestBid),
                highestBidder: highestBidder.toString(),
                auctionEndTime: Number(auctionEndTime),
                ended,
                seller: seller.toString(),
                reservePrice: ethers_1.ethers.formatEther(reservePrice),
                minBidIncrement: ethers_1.ethers.formatEther(minBidIncrement),
            };
        }
        catch (error) {
            console_1.logger.error("AUCTION_SERVICE", "Failed to get auction info", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to get auction info: ${error.message}` });
        }
    }
    async settleAuction(auctionContractAddress) {
        try {
            const { abi } = await getSmartContract("nft", "NFTAuction");
            const auctionContract = new ethers_1.ethers.Contract(auctionContractAddress, abi, this.signer);
            const auctionInfo = await this.getAuctionInfo(auctionContractAddress);
            if (auctionInfo.ended) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Auction already settled" });
            }
            if (auctionInfo.auctionEndTime > Math.floor(Date.now() / 1000)) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Auction has not ended yet" });
            }
            const gasPrice = await (0, gas_helper_1.getGasPrice)(this.provider);
            const tx = await auctionContract.endAuction({
                gasPrice,
                gasLimit: 500000,
            });
            const receipt = await tx.wait();
            if (!receipt) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Transaction receipt not found" });
            }
            const gasUsed = receipt.gasUsed;
            const actualGasPrice = tx.gasPrice || gasPrice;
            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: gasUsed.toString(),
                winnerAddress: auctionInfo.highestBidder !== ethers_1.ethers.ZeroAddress ? auctionInfo.highestBidder : undefined,
                finalBid: auctionInfo.highestBid !== "0.0" ? auctionInfo.highestBid : undefined,
                settled: true,
            };
        }
        catch (error) {
            console_1.logger.error("AUCTION_SERVICE", "Failed to settle auction", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to settle auction: ${error.message}` });
        }
    }
    async withdrawFunds(auctionContractAddress, userAddress) {
        try {
            const { abi } = await getSmartContract("nft", "NFTAuction");
            const auctionContract = new ethers_1.ethers.Contract(auctionContractAddress, abi, this.signer);
            const pendingReturns = await auctionContract.pendingReturns(userAddress);
            if (pendingReturns === BigInt(0)) {
                return false;
            }
            const gasPrice = await (0, gas_helper_1.getGasPrice)(this.provider);
            const tx = await auctionContract.withdraw({
                gasPrice,
                gasLimit: 100000,
            });
            await tx.wait();
            return true;
        }
        catch (error) {
            console_1.logger.error("AUCTION_SERVICE", "Failed to withdraw funds", error);
            return false;
        }
    }
    async checkAndExtendAuction(auctionContractAddress, extendTimeSeconds = 600) {
        try {
            const auctionInfo = await this.getAuctionInfo(auctionContractAddress);
            const currentTime = Math.floor(Date.now() / 1000);
            const timeRemaining = auctionInfo.auctionEndTime - currentTime;
            if (timeRemaining > 0 && timeRemaining < 600) {
                const { abi } = await getSmartContract("nft", "NFTAuction");
                const auctionContract = new ethers_1.ethers.Contract(auctionContractAddress, abi, this.signer);
                const gasPrice = await (0, gas_helper_1.getGasPrice)(this.provider);
                const tx = await auctionContract.extendAuction(extendTimeSeconds, {
                    gasPrice,
                    gasLimit: 100000,
                });
                await tx.wait();
                return true;
            }
            return false;
        }
        catch (error) {
            console_1.logger.error("AUCTION_SERVICE", "Failed to extend auction", error);
            return false;
        }
    }
}
exports.NFTAuctionService = NFTAuctionService;
async function getNFTAuctionService(chain, masterWalletId) {
    return NFTAuctionService.initialize(chain, masterWalletId);
}
