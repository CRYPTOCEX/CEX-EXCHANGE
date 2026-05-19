"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorDeposits = monitorDeposits;
const db_1 = require("@b/db");
const tokens_1 = require("@b/api/(ext)/ecosystem/utils/tokens");
const chains_1 = require("@b/api/(ext)/ecosystem/utils/chains");
const deposit_1 = require("@b/api/(ext)/ecosystem/utils/redis/deposit");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const Websocket_1 = require("@b/handler/Websocket");
const ENABLE_MONITORING = process.env.ENABLE_DEPOSIT_MONITORING === "true";
const EVM_CHECK_INTERVAL = Number(process.env.EVM_CHECK_INTERVAL_MS) || 300000;
const UTXO_CHECK_INTERVAL = Number(process.env.UTXO_CHECK_INTERVAL_MS) || 900000;
const API_THRESHOLD = Number(process.env.API_THRESHOLD) || 100;
const apiUsageCount = {};
async function canUseAPI(chain) {
    const config = chains_1.chainConfigs[chain];
    if (!(config === null || config === void 0 ? void 0 : config.explorerApi))
        return true;
    if (!apiUsageCount[chain])
        apiUsageCount[chain] = 0;
    if (apiUsageCount[chain] >= API_THRESHOLD) {
        console.warn(`API limit reached for ${chain}, skipping this cycle.`);
        return false;
    }
    apiUsageCount[chain] += 1;
    return true;
}
function isEVMChain(chain) {
    var _a;
    return !!((_a = chains_1.chainConfigs[chain]) === null || _a === void 0 ? void 0 : _a.smartContract);
}
async function monitorDeposits() {
    var _a, _b;
    if (!ENABLE_MONITORING) {
        console.log("Deposit monitoring disabled.");
        return;
    }
    console.log("Deposit monitoring enabled. Starting up...");
    const wallets = await db_1.models.wallet.findAll({
        where: { type: "ECO" },
        attributes: ["id", "currency", "address"],
    });
    const chainAddresses = {};
    for (const wallet of wallets) {
        if (!wallet.address)
            continue;
        const addresses = typeof wallet.address === "string"
            ? JSON.parse(wallet.address)
            : wallet.address;
        const currency = wallet.currency;
        for (const chain in addresses) {
            let token;
            try {
                token = await (0, tokens_1.getEcosystemToken)(chain, currency);
            }
            catch (_c) {
                continue;
            }
            const contractType = token.contractType;
            const addr = ((_a = addresses[chain]) === null || _a === void 0 ? void 0 : _a.address) || ((_b = addresses[chain]) === null || _b === void 0 ? void 0 : _b.addr) || addresses[chain];
            if (!addr)
                continue;
            if (!chainAddresses[chain])
                chainAddresses[chain] = [];
            chainAddresses[chain].push({
                walletId: wallet.id,
                address: contractType === "NO_PERMIT" ? addr : addr,
                currency,
                contractType,
            });
        }
    }
    const evmChains = Object.keys(chainAddresses).filter(isEVMChain);
    if (evmChains.length > 0) {
        setInterval(async () => {
            for (const chain of evmChains) {
                if (!(await canUseAPI(chain)))
                    continue;
                await checkDepositsForChain(chain, chainAddresses[chain]);
            }
        }, EVM_CHECK_INTERVAL);
    }
    const nonEVMChains = Object.keys(chainAddresses).filter((c) => !isEVMChain(c));
    if (nonEVMChains.length > 0) {
        setInterval(async () => {
            for (const chain of nonEVMChains) {
                if (!(await canUseAPI(chain)))
                    continue;
                await checkDepositsForChain(chain, chainAddresses[chain]);
            }
        }, UTXO_CHECK_INTERVAL);
    }
}
async function checkDepositsForChain(chain, addressesData) {
    var _a, _b, _c;
    const config = chains_1.chainConfigs[chain];
    if (!config || !config.fetchFunction) {
        console.warn(`No fetch function for chain: ${chain}`);
        return;
    }
    for (const data of addressesData) {
        let transactions;
        try {
            transactions = await config.fetchFunction(data.address);
            if (!Array.isArray(transactions))
                continue;
            for (const tx of transactions) {
                if (tx.to &&
                    tx.to.toLowerCase() === data.address.toLowerCase() &&
                    tx.status === "CONFIRMED") {
                    await (0, deposit_1.storeAndBroadcastTransaction)(tx, tx.hash);
                    try {
                        const response = await (0, wallet_1.handleEcosystemDeposit)({
                            ...tx,
                            id: data.walletId,
                            chain: chain,
                            contractType: data.contractType,
                        });
                        if ((response === null || response === void 0 ? void 0 : response.transactionId) && (0, Websocket_1.hasClients)(`/api/ecosystem/deposit`)) {
                            Websocket_1.messageBroker.broadcastToSubscribedClients("/api/ecosystem/deposit", {
                                currency: (_a = response.wallet) === null || _a === void 0 ? void 0 : _a.currency,
                                chain: chain,
                                address: data.address,
                            }, {
                                stream: "verification",
                                data: {
                                    status: 200,
                                    message: "Transaction completed",
                                    ...response,
                                    trx: tx,
                                    balance: (_b = response.wallet) === null || _b === void 0 ? void 0 : _b.balance,
                                    currency: (_c = response.wallet) === null || _c === void 0 ? void 0 : _c.currency,
                                    chain: chain,
                                    method: "Wallet Deposit",
                                },
                            });
                        }
                    }
                    catch (error) {
                        console.error(`Error handling deposit for ${tx.hash}: ${error.message}`);
                    }
                }
            }
        }
        catch (error) {
            console.error(`Error fetching transactions for chain ${chain}, address ${data.address}: ${error.message}`);
        }
    }
}
