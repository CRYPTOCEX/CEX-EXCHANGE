"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTokenHolders = void 0;
exports.getTokenContractAddress = getTokenContractAddress;
exports.deployTokenContract = deployTokenContract;
exports.getEcosystemToken = getEcosystemToken;
const ethers_1 = require("ethers");
const chains_1 = require("./chains");
const redis_1 = require("../../../../utils/redis");
const gas_1 = require("./gas");
const smartContract_1 = require("./smartContract");
const encrypt_1 = require("../../../../utils/encrypt");
const provider_1 = require("./provider");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const CACHE_EXPIRATION = 300;
async function getTokenContractAddress(chain, currency) {
    try {
        const token = await getEcosystemToken(chain, currency);
        if (!token) {
            throw (0, error_1.createError)({ statusCode: 404, message: `No token found for chain "${chain}" and currency "${currency}".` });
        }
        const contractAddress = token.contract;
        if (!ethers_1.ethers.isAddress(contractAddress)) {
            throw (0, error_1.createError)({ statusCode: 400, message: `The token contract address "${contractAddress}" is invalid.` });
        }
        return {
            contractAddress,
            contractType: token.contractType,
            tokenDecimals: token.decimals,
        };
    }
    catch (error) {
        console_1.logger.error("TOKEN_CONTRACT", `Unable to retrieve token contract details for chain "${chain}" and currency "${currency}"`, error);
        throw (0, error_1.createError)({ statusCode: error.statusCode || 500, message: `Unable to retrieve token contract details for chain "${chain}" and currency "${currency}". ${error.message || "Please try again later."}` });
    }
}
const fetchTokenHolders = async (chain, network, contract) => {
    try {
        const chainConfig = chains_1.chainConfigs[chain];
        if (!chainConfig) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Chain "${chain}" is not supported.` });
        }
        const apiKey = process.env[`${chain}_EXPLORER_API_KEY`] || process.env.ETHERSCAN_API_KEY;
        if (!apiKey) {
            throw (0, error_1.createError)({ statusCode: 500, message: `${chain}_EXPLORER_API_KEY or ETHERSCAN_API_KEY is not configured.` });
        }
        const networkConfig = chainConfig.networks[network];
        if (!networkConfig || !networkConfig.explorer) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Network "${network}" for chain "${chain}" is not supported.` });
        }
        const cacheKey = `token:${contract}:holders`;
        const cachedData = await getCachedData(cacheKey);
        if (cachedData) {
            return cachedData;
        }
        const apiUrl = `https://${networkConfig.explorer}/api?module=account&action=tokentx&contractaddress=${contract}&page=1&offset=100&sort=asc&apikey=${apiKey}`;
        let data;
        try {
            const response = await fetch(apiUrl);
            data = await response.json();
        }
        catch (error) {
            console_1.logger.error("TOKEN_HOLDERS", "Failed to fetch token holders", error);
            throw (0, error_1.createError)({ statusCode: 500, message: "Failed to fetch token holders. Please check the API connection." });
        }
        if (data.status === "0" && data.message === "NOTOK") {
            console_1.logger.warn("TOKEN_HOLDERS", `Etherscan API error for token holders of contract ${contract}: ${data.result}`);
            return {};
        }
        if (data.status !== "1") {
            throw (0, error_1.createError)({ statusCode: 502, message: `Explorer API returned error: ${data.message}` });
        }
        const holders = {};
        for (const tx of data.result) {
            const { from, to, value } = tx;
            holders[from] = (holders[from] || 0) - parseFloat(value);
            holders[to] = (holders[to] || 0) + parseFloat(value);
        }
        const decimals = chainConfig.decimals || 18;
        const formattedHolders = Object.entries(holders)
            .map(([address, balance]) => ({
            address,
            balance: parseFloat((balance / Math.pow(10, decimals)).toFixed(8)),
        }))
            .filter((holder) => holder.balance > 0);
        const redis = redis_1.RedisSingleton.getInstance();
        await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(formattedHolders));
        return formattedHolders;
    }
    catch (error) {
        console_1.logger.error("TOKEN_HOLDERS", `Failed to fetch token holders for contract "${contract}" on chain "${chain}"`, error);
        throw (0, error_1.createError)({ statusCode: error.statusCode || 500, message: `Failed to fetch token holders for contract "${contract}" on chain "${chain}". ${error.message || "Please try again later."}` });
    }
};
exports.fetchTokenHolders = fetchTokenHolders;
const getCachedData = async (cacheKey) => {
    const redis = redis_1.RedisSingleton.getInstance();
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return JSON.parse(cachedData);
    }
    return null;
};
async function deployTokenContract(masterWallet, chain, name, symbol, receiver, decimals, initialBalance, cap) {
    var _a, _b;
    try {
        const provider = await (0, provider_1.getProvider)(chain);
        if (!provider) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Provider not initialized" });
        }
        if (!masterWallet.data) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Master wallet data not found" });
        }
        const decryptedData = JSON.parse((0, encrypt_1.decrypt)(masterWallet.data));
        if (!decryptedData || !decryptedData.privateKey) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Decrypted data or Mnemonic not found" });
        }
        const { privateKey } = decryptedData;
        const signer = new ethers_1.ethers.Wallet(privateKey).connect(provider);
        const smartContractFile = (_b = (_a = chains_1.chainConfigs[chain]) === null || _a === void 0 ? void 0 : _a.smartContract) === null || _b === void 0 ? void 0 : _b.file;
        if (!smartContractFile) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Smart contract file not found for chain ${chain}` });
        }
        const { abi, bytecode } = await (0, smartContract_1.getSmartContract)("token", smartContractFile);
        if (!abi || !bytecode) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Smart contract ABI or Bytecode not found" });
        }
        const tokenFactory = new ethers_1.ContractFactory(abi, bytecode, signer);
        if (initialBalance === undefined || cap === undefined) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Initial balance or Cap is undefined" });
        }
        const adjustedInitialBalance = ethers_1.ethers.parseUnits(initialBalance.toString(), decimals);
        const adjustedCap = ethers_1.ethers.parseUnits(cap.toString(), decimals);
        const gasPrice = await (0, gas_1.getAdjustedGasPrice)(provider);
        const tokenContract = await tokenFactory.deploy(name, symbol, receiver, decimals, adjustedCap, adjustedInitialBalance, {
            gasPrice: gasPrice,
        });
        const response = await tokenContract.waitForDeployment();
        return await response.getAddress();
    }
    catch (error) {
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to deploy token contract on chain "${chain}". ${error.message || "An unknown error occurred."}` });
    }
}
async function getEcosystemToken(chain, currency) {
    const specialChains = ['XMR', 'TON', 'SOL', 'TRON', 'BTC', 'LTC', 'DOGE', 'DASH'];
    const whereClause = {
        chain: chain,
        currency: currency,
        status: true,
    };
    if (!specialChains.includes(chain)) {
        const network = process.env[`${chain}_NETWORK`];
        if (network) {
            whereClause.network = network;
        }
    }
    const token = await db_1.models.ecosystemToken.findOne({
        where: whereClause,
    });
    if (!token) {
        throw (0, error_1.createError)({ statusCode: 404, message: `Token not found for chain: ${chain} and currency: ${currency}` });
    }
    return token;
}
