"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContractAbi = void 0;
exports.getSmartContract = getSmartContract;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chains_1 = require("./chains");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
async function getSmartContract(contractPath, name) {
    const cwd = process.cwd();
    const isInBackend = cwd.endsWith('backend');
    const filePath = path_1.default.resolve(cwd, isInBackend
        ? `ecosystem/smart-contracts/${contractPath}/${name}.json`
        : `backend/ecosystem/smart-contracts/${contractPath}/${name}.json`);
    try {
        const fileContent = fs_1.default.readFileSync(filePath, "utf8");
        const contractJson = JSON.parse(fileContent);
        const { abi, bytecode } = contractJson;
        if (!bytecode || !abi)
            throw (0, error_1.createError)({ statusCode: 404, message: `Failed to extract bytecode or ABI for ${name}` });
        return { abi, bytecode };
    }
    catch (error) {
        console_1.logger.error("SMART_CONTRACT", `Failed to read contract JSON for ${name}`, error);
        throw error;
    }
}
const getContractAbi = async (chain, network, contractAddress) => {
    const chainConfig = chains_1.chainConfigs[chain];
    if (!chainConfig) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported chain: ${chain}` });
    }
    const apiKey = process.env[`${chain}_EXPLORER_API_KEY`] || process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
        throw (0, error_1.createError)({ statusCode: 500, message: `${chain}_EXPLORER_API_KEY or ETHERSCAN_API_KEY is not set` });
    }
    const networkConfig = chainConfig.networks[network];
    if (!networkConfig || !networkConfig.explorer) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported network: ${network} for chain: ${chain}` });
    }
    const apiUrl = `https://${networkConfig.explorer}/api?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (data.status === "0" && data.message === "NOTOK") {
            console_1.logger.warn("CONTRACT_ABI", `Etherscan API error for contract ABI ${contractAddress}: ${data.result}`);
            throw (0, error_1.createError)({ statusCode: 404, message: `Contract ABI not available: ${data.result}` });
        }
        if (data.status !== "1") {
            throw (0, error_1.createError)({ statusCode: 500, message: `API Error: ${data.message}` });
        }
        return data.result;
    }
    catch (error) {
        console_1.logger.error("CONTRACT_ABI", "Failed to fetch contract ABI", error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch contract ABI: ${error.message}` });
    }
};
exports.getContractAbi = getContractAbi;
