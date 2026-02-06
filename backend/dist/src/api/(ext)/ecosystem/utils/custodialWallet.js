"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustodialWalletBalances = getCustodialWalletBalances;
exports.getCustodialWalletTokenBalance = getCustodialWalletTokenBalance;
exports.getCustodialWalletNativeBalance = getCustodialWalletNativeBalance;
exports.getCustodialWalletContract = getCustodialWalletContract;
exports.deployCustodialContract = deployCustodialContract;
exports.getActiveCustodialWallets = getActiveCustodialWallets;
const ethers_1 = require("ethers");
const smartContract_1 = require("./smartContract");
const provider_1 = require("./provider");
const encrypt_1 = require("../../../../utils/encrypt");
const gas_1 = require("./gas");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
async function getCustodialWalletBalances(contract, tokens, format = true) {
    try {
        const tokensAddresses = tokens.map((token) => token.contract);
        const [nativeBalance, tokenBalances] = await contract.getAllBalances(tokensAddresses);
        const balances = tokenBalances.map((balance, index) => ({
            ...tokens[index],
            balance: format
                ? ethers_1.ethers.formatUnits(balance, tokens[index].decimals)
                : balance,
        }));
        const native = format ? ethers_1.ethers.formatEther(nativeBalance) : nativeBalance;
        return { balances, native };
    }
    catch (error) {
        console_1.logger.error("ECOSYSTEM", "Failed to get custodial wallet balances", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to get custodial wallet balances: ${error.message}`
        });
    }
}
async function getCustodialWalletTokenBalance(contract, tokenContractAddress) {
    try {
        return await contract.getTokenBalance(tokenContractAddress);
    }
    catch (error) {
        console_1.logger.error("ECOSYSTEM", "Failed to get custodial wallet token balance", error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to get token balance: ${error.message}` });
    }
}
async function getCustodialWalletNativeBalance(contract) {
    try {
        return await contract.getNativeBalance();
    }
    catch (error) {
        console_1.logger.error("ECOSYSTEM", "Failed to get custodial wallet native balance", error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to get native balance: ${error.message}` });
    }
}
async function getCustodialWalletContract(address, provider) {
    try {
        const { abi } = await (0, smartContract_1.getSmartContract)("wallet", "CustodialWalletERC20");
        if (!abi) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Smart contract ABI or Bytecode not found" });
        }
        return new ethers_1.ethers.Contract(address, abi, provider);
    }
    catch (error) {
        console_1.logger.error("ECOSYSTEM", "Failed to get custodial wallet contract", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to get custodial wallet contract: ${error.message}`
        });
    }
}
async function deployCustodialContract(masterWallet) {
    try {
        const provider = await (0, provider_1.getProvider)(masterWallet.chain);
        if (!provider) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Provider not initialized" });
        }
        let decryptedData;
        try {
            decryptedData = JSON.parse((0, encrypt_1.decrypt)(masterWallet.data));
        }
        catch (error) {
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to decrypt mnemonic: ${error.message}` });
        }
        if (!decryptedData || !decryptedData.privateKey) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Decrypted data or Mnemonic not found" });
        }
        const { privateKey } = decryptedData;
        const signer = new ethers_1.ethers.Wallet(privateKey).connect(provider);
        const { abi, bytecode } = await (0, smartContract_1.getSmartContract)("wallet", "CustodialWalletERC20");
        if (!abi || !bytecode) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Smart contract ABI or Bytecode not found" });
        }
        const custodialWalletFactory = new ethers_1.ContractFactory(abi, bytecode, signer);
        const gasPrice = await (0, gas_1.getAdjustedGasPrice)(provider);
        const custodialWalletContract = await custodialWalletFactory.deploy(masterWallet.address, {
            gasPrice: gasPrice,
        });
        const response = await custodialWalletContract.waitForDeployment();
        return await response.getAddress();
    }
    catch (error) {
        console_1.logger.error("ECOSYSTEM", "Failed to deploy custodial wallet contract", error);
        if ((0, ethers_1.isError)(error, "INSUFFICIENT_FUNDS")) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Not enough funds to deploy the contract" });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
}
async function getActiveCustodialWallets(chain, ctx) {
    try {
        const wallet = await db_1.models.ecosystemCustodialWallet.findAll({
            where: {
                chain: chain,
                status: true,
            },
        });
        if (!wallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: "No active custodial wallets found" });
        }
        return wallet;
    }
    catch (error) {
        console_1.logger.error("ECOSYSTEM", "Failed to get active custodial wallets", error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to get active custodial wallets: ${error.message}` });
    }
}
