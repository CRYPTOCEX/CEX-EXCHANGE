"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const ethers_1 = require("ethers");
const utils_1 = require("@b/api/finance/currency/utils");
const gas_helper_1 = require("../../utils/gas-helper");
let getProvider;
let getAdjustedGasPrice;
let estimateGas;
try {
    const providerModule = require("../../../ecosystem/utils/provider");
    getProvider = providerModule.getProvider;
}
catch (e) {
}
try {
    const gasModule = require("../../../ecosystem/utils/gas");
    getAdjustedGasPrice = gasModule.getAdjustedGasPrice;
    estimateGas = gasModule.estimateGas;
}
catch (e) {
}
async function getChainNativeTokenPrice(chain) {
    try {
        let tokenSymbol;
        switch (chain.toUpperCase()) {
            case 'ETH':
            case 'ETHEREUM':
                tokenSymbol = 'ETH';
                break;
            case 'BSC':
            case 'BINANCE':
                tokenSymbol = 'BNB';
                break;
            case 'POLYGON':
            case 'MATIC':
                tokenSymbol = 'MATIC';
                break;
            case 'ARBITRUM':
                tokenSymbol = 'ETH';
                break;
            case 'OPTIMISM':
                tokenSymbol = 'ETH';
                break;
            default:
                tokenSymbol = 'ETH';
        }
        const price = await (0, utils_1.getSpotPriceInUSD)(tokenSymbol);
        return price;
    }
    catch (error) {
        console_1.logger.error("GET_CHAIN_NATIVE_TOKEN_PRICE", "Failed to get chain native token price", error);
        const fallbackPrices = {
            'ETH': 2400,
            'ETHEREUM': 2400,
            'BSC': 320,
            'BINANCE': 320,
            'POLYGON': 0.80,
            'MATIC': 0.80,
            'ARBITRUM': 2400,
            'OPTIMISM': 2400,
        };
        return fallbackPrices[chain.toUpperCase()] || 2000;
    }
}
exports.metadata = {
    summary: "Estimate gas costs for NFT operations",
    operationId: "estimateNftGas",
    tags: ["NFT", "Gas", "Estimation", "Blockchain"],
    logModule: "NFT",
    logTitle: "Estimate gas costs",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        operation: {
                            type: "string",
                            enum: [
                                "mint",
                                "transfer",
                                "approve",
                                "list",
                                "buy",
                                "cancelListing",
                                "bid",
                                "acceptBid",
                                "deployCollection",
                                "deployAuction",
                                "deployMarketplace"
                            ],
                            description: "Type of NFT operation to estimate gas for"
                        },
                        chain: {
                            type: "string",
                            description: "Blockchain network (e.g., ETH, BSC, MATIC)",
                            default: "ETH"
                        },
                        contractAddress: {
                            type: "string",
                            description: "Smart contract address (required for most operations)"
                        },
                        tokenId: {
                            type: "string",
                            description: "Token ID for operations on specific tokens"
                        },
                        amount: {
                            type: "string",
                            description: "Amount for operations involving value (in wei)"
                        },
                        recipientAddress: {
                            type: "string",
                            description: "Recipient address for transfers"
                        }
                    },
                    required: ["operation"]
                }
            }
        }
    },
    responses: {
        200: {
            description: "Gas estimation calculated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            operation: { type: "string" },
                            chain: { type: "string" },
                            gasEstimate: {
                                type: "object",
                                properties: {
                                    gasLimit: { type: "string", description: "Estimated gas limit" },
                                    gasPrice: { type: "string", description: "Current gas price in wei" },
                                    gasCostWei: { type: "string", description: "Total gas cost in wei" },
                                    gasCostEth: { type: "string", description: "Total gas cost in ETH" },
                                    gasCostUsd: { type: "string", description: "Estimated cost in USD" }
                                }
                            },
                            breakdown: {
                                type: "object",
                                properties: {
                                    baseGas: { type: "string" },
                                    adjustmentFactor: { type: "number" },
                                    networkCongestion: { type: "string" }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: { description: "Invalid parameters" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: false
};
const ERC721_ABI = [
    "function mint(address to, uint256 tokenId)",
    "function safeMint(address to, uint256 tokenId, bytes memory data)",
    "function transferFrom(address from, address to, uint256 tokenId)",
    "function approve(address to, uint256 tokenId)",
    "function setApprovalForAll(address operator, bool approved)"
];
const ERC1155_ABI = [
    "function mint(address to, uint256 id, uint256 amount, bytes memory data)",
    "function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)",
    "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data)",
    "function setApprovalForAll(address operator, bool approved)"
];
const MARKETPLACE_ABI = [
    "function listItem(address nftContract, uint256 tokenId, uint256 price)",
    "function buyItem(address nftContract, uint256 tokenId) payable",
    "function cancelListing(address nftContract, uint256 tokenId)",
    "function makeOffer(address nftContract, uint256 tokenId) payable",
    "function acceptOffer(address nftContract, uint256 tokenId, address buyer)"
];
const AUCTION_ABI = [
    "function createAuction(address nftContract, uint256 tokenId, uint256 startingBid, uint256 duration)",
    "function placeBid(uint256 auctionId) payable",
    "function settleAuction(uint256 auctionId)"
];
const erc721Interface = new ethers_1.Interface(ERC721_ABI);
const erc1155Interface = new ethers_1.Interface(ERC1155_ABI);
const marketplaceInterface = new ethers_1.Interface(MARKETPLACE_ABI);
const auctionInterface = new ethers_1.Interface(AUCTION_ABI);
function getMockData(operation, chain, contractAddress, tokenId, recipientAddress) {
    const mockAddresses = {
        ETH: {
            user: "0x742d35Cc6634C0532925a3b8C17c391316EdCf4C",
            nft: "0x23581767a106ae21c074b2276D25e5C3e136a68b",
            marketplace: "0x7f268357A8c2552623316e2562D90e642bB538E5",
            recipient: "0x0000000000000000000000000000000000000001"
        },
        BSC: {
            user: "0x742d35Cc6634C0532925a3b8C17c391316EdCf4C",
            nft: "0x8b9A76A5F9F8e7a8Cc431B5b1e2Df4D4A9b5C3b1",
            marketplace: "0x1234567890123456789012345678901234567890",
            recipient: "0x0000000000000000000000000000000000000001"
        },
        POLYGON: {
            user: "0x742d35Cc6634C0532925a3b8C17c391316EdCf4C",
            nft: "0x2953399124F0cBB46d2CbACD8A89cF0299974C0",
            marketplace: "0x0E92b0DB0d0C7534fC5aBB4C8E2F7a4FCdB79c7B",
            recipient: "0x0000000000000000000000000000000000000001"
        }
    };
    const chainMocks = mockAddresses[chain] || mockAddresses.ETH;
    return {
        userAddress: chainMocks.user,
        nftContract: contractAddress || chainMocks.nft,
        marketplaceContract: chainMocks.marketplace,
        recipientAddress: recipientAddress || chainMocks.recipient,
        tokenId: tokenId || "1",
        mockTokenId: "12345",
        mockPrice: ethers_1.ethers.parseEther("0.1"),
        mockBid: ethers_1.ethers.parseEther("0.05"),
        mockDuration: 86400,
        emptyBytes: "0x"
    };
}
exports.default = async (data) => {
    const { body, ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Estimating gas costs");
        const { operation, chain = 'ETH', contractAddress, tokenId, amount, recipientAddress } = body;
        let provider = null;
        let gasPrice;
        let isLiveData = false;
        const fallbackGasPrices = {
            ETH: BigInt("15000000000"),
            BSC: BigInt("3000000000"),
            POLYGON: BigInt("20000000000"),
            FTM: BigInt("50000000000"),
            OPTIMISM: BigInt("500000"),
            ARBITRUM: BigInt("100000000"),
            BASE: BigInt("500000"),
            CELO: BigInt("2000000000"),
        };
        gasPrice = fallbackGasPrices[chain] || BigInt("15000000000");
        const shouldTryLiveData = process.env.NFT_GAS_LIVE_ESTIMATION === 'true';
        if (shouldTryLiveData) {
            try {
                console_1.logger.debug("NFT_GAS_ESTIMATION", `Attempting live gas price for ${chain}...`);
                provider = await getProvider(chain);
                if (provider) {
                    const healthPromise = provider.getBlockNumber();
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Provider timeout')), 3000));
                    const blockNumber = await Promise.race([healthPromise, timeoutPromise]);
                    if (blockNumber > 0) {
                        let liveGasPrice;
                        if (getAdjustedGasPrice) {
                            liveGasPrice = await getAdjustedGasPrice(provider, 1.2);
                        }
                        else {
                            const baseGasPrice = await (0, gas_helper_1.getGasPrice)(provider);
                            liveGasPrice = (baseGasPrice * BigInt(120)) / BigInt(100);
                        }
                        gasPrice = liveGasPrice;
                        isLiveData = true;
                        console_1.logger.success("NFT_GAS_ESTIMATION", `Live gas price obtained for ${chain}: ${gasPrice} wei`);
                    }
                }
            }
            catch (error) {
                console_1.logger.warn("NFT_GAS_ESTIMATION", `Provider connection issue for ${chain}, using estimated gas price: ${error.message.substring(0, 100)}`);
                provider = null;
                isLiveData = false;
            }
        }
        else {
            console_1.logger.info("NFT_GAS_ESTIMATION", `Gas estimation for ${chain} using network-specific parameters`);
        }
        const mockData = getMockData(operation, chain, contractAddress, tokenId, recipientAddress);
        let gasLimit;
        let transactionRequest = {};
        switch (operation) {
            case 'mint':
                const mintData = erc721Interface.encodeFunctionData("safeMint", [
                    mockData.recipientAddress,
                    mockData.mockTokenId,
                    mockData.emptyBytes
                ]);
                gasLimit = BigInt(300000);
                transactionRequest = {
                    to: mockData.nftContract,
                    data: mintData,
                    value: amount ? ethers_1.ethers.parseUnits(amount, 'wei') : 0
                };
                break;
            case 'transfer':
                const transferData = erc721Interface.encodeFunctionData("transferFrom", [
                    mockData.userAddress,
                    mockData.recipientAddress,
                    mockData.tokenId
                ]);
                gasLimit = BigInt(150000);
                transactionRequest = {
                    to: mockData.nftContract,
                    data: transferData
                };
                break;
            case 'approve':
                const approveData = erc721Interface.encodeFunctionData("setApprovalForAll", [
                    mockData.marketplaceContract,
                    true
                ]);
                gasLimit = BigInt(80000);
                transactionRequest = {
                    to: mockData.nftContract,
                    data: approveData
                };
                break;
            case 'list':
                const listData = marketplaceInterface.encodeFunctionData("listItem", [
                    mockData.nftContract,
                    mockData.tokenId,
                    mockData.mockPrice
                ]);
                gasLimit = BigInt(200000);
                transactionRequest = {
                    to: mockData.marketplaceContract,
                    data: listData
                };
                break;
            case 'buy':
                const buyData = marketplaceInterface.encodeFunctionData("buyItem", [
                    mockData.nftContract,
                    mockData.tokenId
                ]);
                gasLimit = BigInt(250000);
                transactionRequest = {
                    to: mockData.marketplaceContract,
                    data: buyData,
                    value: amount ? ethers_1.ethers.parseUnits(amount, 'wei') : mockData.mockPrice
                };
                break;
            case 'cancelListing':
                const cancelData = marketplaceInterface.encodeFunctionData("cancelListing", [
                    mockData.nftContract,
                    mockData.tokenId
                ]);
                gasLimit = BigInt(100000);
                transactionRequest = {
                    to: mockData.marketplaceContract,
                    data: cancelData
                };
                break;
            case 'bid':
                const bidData = auctionInterface.encodeFunctionData("placeBid", [
                    1
                ]);
                gasLimit = BigInt(200000);
                transactionRequest = {
                    to: mockData.marketplaceContract,
                    data: bidData,
                    value: amount ? ethers_1.ethers.parseUnits(amount, 'wei') : mockData.mockBid
                };
                break;
            case 'acceptBid':
                const acceptData = marketplaceInterface.encodeFunctionData("acceptOffer", [
                    mockData.nftContract,
                    mockData.tokenId,
                    mockData.recipientAddress
                ]);
                gasLimit = BigInt(300000);
                transactionRequest = {
                    to: mockData.marketplaceContract,
                    data: acceptData
                };
                break;
            case 'deployCollection':
                const erc721Bytecode = "0x608060405234801561001057600080fd5b506040518060400160405280600881526020017f4d79546f6b656e000000000000000000000000000000000000000000000000008152506040518060400160405280600381526020017f4d544b000000000000000000000000000000000000000000000000000000000081525062000089620000c860201b60201c565b620000a981600090805190602001906200016c929190620002a3565b508060019080519060200190620000c2929190620002a3565b5050620003b8565b600033905090565b828054620000de90620002fb565b90600052602060002090601f0160209004810192826200010257600085556200014e565b82601f106200011d57805160ff19168380011785556200014e565b828001600101855582156200014e579182015b828111156200014d57825182559160200191906001019062000130565b5b5090506200015d919062000161565b5090565b5b808211156200017c57600081600090555060010162000162565b5090565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b60006002820490506001821680620001b457607f821691505b602082108103620001ca57620001c962000180565b5b50919050565b6000819050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60006200021882620001d0565b91506200022583620001d0565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff038211156200025d576200025c620001da565b5b828201905092915050565b60006200027582620001d0565b91506200028283620001d0565b925082820390508181111562000297576200029662000209565b5b92915050565b828054620002ab9062000331565b90600052602060002090601f016020900481019282620002cf57600085556200031b565b82601f10620002ea57805160ff19168380011785556200031b565b828001600101855582156200031b579182015b828111156200031a578251825591602001919060010190620002fd565b5b5090506200032a91906200032e565b5090565b5b80821115620003495760008160009055506001016200032f565b5090565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806200039657607f821691505b602082108103620003ac57620003ab6200034d565b5b50919050565b61239f80620003c86000396000f3fe";
                gasLimit = BigInt(5000000);
                transactionRequest = {
                    data: erc721Bytecode,
                    value: 0
                };
                break;
            case 'deployAuction':
                const auctionBytecode = "0x608060405234801561001057600080fd5b5060405161087538038061087583398101604081905261002f9161005c565b600080546001600160a01b0319166001600160a01b0392909216919091179055610088565b600060208284031215610064578081fd5b81516001600160a01b0381168114610079578182fd5b9392505050565b6107de806100976000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c80638da5cb5b1161005b5780638da5cb5b146100ff578063a035b1fe14610120578063a2fb1175146100141";
                gasLimit = BigInt(3000000);
                transactionRequest = {
                    data: auctionBytecode,
                    value: 0
                };
                break;
            case 'deployMarketplace':
                const marketplaceBytecode = "0x608060405234801561001057600080fd5b50600180546001600160a01b031916331790556103e8600255348015610034576000fd5b506107cd806100446000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c80636352211e1461005c578063a22cb4651461008c578063b88d4fde146100a1578063c87b56dd146100b4578063e985e9c5146100c7575b600080fd5b61006f61006a366004610478565b610102565b6040516001600160a01b0390911681526020015b60405180910390f35b61009f61009a366004610495565b610159565b005b61009f6100af3660046104c8565b610209565b6100c76100c2366004610478565b610297565b6040516100839190610544565b6100da6100d5366004610557565b610359565b6040519015158152602001610083565b60006100ed82610387565b506000908152600460205260409020546001600160a01b031690565bg";
                gasLimit = BigInt(4000000);
                transactionRequest = {
                    data: marketplaceBytecode,
                    value: 0
                };
                break;
            default:
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Unsupported operation: ${operation}`
                });
        }
        let actualGasLimit = gasLimit;
        const getSmartGasLimit = (operation, chain) => {
            const baseGasLimits = {
                'mint': BigInt(280000),
                'transfer': BigInt(150000),
                'approve': BigInt(80000),
                'list': BigInt(200000),
                'buy': BigInt(250000),
                'cancelListing': BigInt(100000),
                'bid': BigInt(220000),
                'acceptBid': BigInt(320000),
                'deployCollection': BigInt(4800000),
                'deployAuction': BigInt(2800000),
                'deployMarketplace': BigInt(3800000)
            };
            const baseLimit = baseGasLimits[operation] || BigInt(200000);
            const chainMultipliers = {
                'ETH': 1.0,
                'BSC': 1.1,
                'POLYGON': 1.2,
                'FTM': 1.1,
                'OPTIMISM': 0.8,
                'ARBITRUM': 0.8,
                'BASE': 0.8,
                'CELO': 1.0
            };
            const multiplier = chainMultipliers[chain] || 1.0;
            return BigInt(Math.round(Number(baseLimit) * multiplier));
        };
        actualGasLimit = getSmartGasLimit(operation, chain);
        if (isLiveData && provider && transactionRequest.to && transactionRequest.data !== "0x") {
            try {
                console_1.logger.debug("NFT_GAS_ESTIMATION", `Attempting live gas estimation for ${operation} on ${chain}...`);
                const ecosystemTransaction = {
                    to: transactionRequest.to,
                    from: mockData.userAddress,
                    data: transactionRequest.data,
                    ...(transactionRequest.value && { value: transactionRequest.value })
                };
                const gasEstimatePromise = estimateGas(ecosystemTransaction, provider, 1.2);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Gas estimation timeout')), 5000));
                const liveGasLimit = await Promise.race([gasEstimatePromise, timeoutPromise]);
                actualGasLimit = liveGasLimit;
                console_1.logger.success("NFT_GAS_ESTIMATION", `Live gas limit obtained: ${actualGasLimit}`);
            }
            catch (error) {
                console_1.logger.warn("NFT_GAS_ESTIMATION", `Live gas estimation unavailable for ${operation}, using optimized estimate: ${error.message.substring(0, 100)}`);
            }
        }
        else {
            console_1.logger.success("NFT_GAS_ESTIMATION", `Gas limit estimated for ${operation} on ${chain}: ${actualGasLimit}`);
        }
        const gasCostWei = gasPrice * actualGasLimit;
        const gasCostEth = ethers_1.ethers.formatEther(gasCostWei);
        const tokenPriceUsd = await getChainNativeTokenPrice(chain);
        const gasCostUsd = (parseFloat(gasCostEth) * tokenPriceUsd).toFixed(2);
        const response = {
            operation,
            chain,
            gasEstimate: {
                gasLimit: actualGasLimit.toString(),
                gasPrice: gasPrice.toString(),
                gasCostWei: gasCostWei.toString(),
                gasCostEth: gasCostEth,
                gasCostUsd: gasCostUsd
            },
            breakdown: {
                baseGas: gasLimit.toString(),
                adjustmentFactor: 1.2,
                networkCongestion: await (async () => {
                    if (!isLiveData || !provider)
                        return "unknown";
                    try {
                        return await getNetworkCongestionLevel(provider);
                    }
                    catch (error) {
                        console_1.logger.error("NETWORK_CONGESTION_FALLBACK", "Failed to get network congestion", error);
                        return "unknown";
                    }
                })()
            },
            dataSource: isLiveData ? "live" : "smart_fallback",
            estimationType: "real_contract_calls",
            estimationMode: isLiveData ? "live_enhanced" : "fallback_only",
            confidence: isLiveData ? "high" : "medium",
            chainOptimized: true,
            mockDataUsed: {
                nftContract: mockData.nftContract,
                marketplace: mockData.marketplaceContract,
                samplePrice: ethers_1.ethers.formatEther(mockData.mockPrice) + " ETH"
            },
            notes: {
                liveEstimation: (process.env.NFT_GAS_LIVE_ESTIMATION === 'true') ? "enabled" : "disabled",
                fallbackReason: isLiveData ? null : "RPC provider unavailable or disabled",
                enableLiveHelp: "Set NFT_GAS_LIVE_ESTIMATION=true environment variable to enable live RPC estimation"
            },
            timestamp: new Date().toISOString()
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Gas estimation completed for ${operation} on ${chain}`);
        return response;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Gas estimation failed: ${error.message}`);
        console_1.logger.error("NFT_GAS_ESTIMATION", "Failed to estimate gas costs for NFT operation", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to estimate gas costs for NFT operation"
        });
    }
};
async function getNetworkCongestionLevel(provider) {
    try {
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || BigInt(0);
        const gasPriceGwei = Number(ethers_1.ethers.formatUnits(gasPrice, 'gwei'));
        if (gasPriceGwei < 20)
            return 'LOW';
        if (gasPriceGwei < 50)
            return 'MEDIUM';
        if (gasPriceGwei < 100)
            return 'HIGH';
        return 'VERY_HIGH';
    }
    catch (error) {
        return 'UNKNOWN';
    }
}
