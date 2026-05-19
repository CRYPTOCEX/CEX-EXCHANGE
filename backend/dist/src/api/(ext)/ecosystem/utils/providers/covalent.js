"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CovalentProvider = void 0;
const console_1 = require("@b/utils/console");
const COVALENT_CHAIN_MAP = {
    ETH: "eth-mainnet",
    BSC: "bsc-mainnet",
    POLYGON: "matic-mainnet",
    ARBITRUM: "arbitrum-mainnet",
    OPTIMISM: "optimism-mainnet",
    BASE: "base-mainnet",
    AVAX: "avalanche-mainnet",
    FTM: "fantom-mainnet",
    LINEA: "linea-mainnet",
    CELO: "celo-mainnet",
};
class CovalentProvider {
    constructor() {
        this.name = "covalent";
    }
    supports(chain) {
        return chain in COVALENT_CHAIN_MAP;
    }
    async fetchTransactions(config) {
        var _a;
        const { chain, address } = config;
        const apiKey = process.env.COVALENT_API_KEY;
        if (!apiKey) {
            throw new Error("COVALENT_API_KEY is not set");
        }
        const chainName = COVALENT_CHAIN_MAP[chain];
        if (!chainName) {
            throw new Error(`Covalent does not support chain: ${chain}`);
        }
        const url = `https://api.covalenthq.com/v1/${chainName}/address/${address}/transactions_v3/page/0/`;
        console_1.logger.info("COVALENT", `${chain} Fetching transactions for ${address.substring(0, 10)}...`);
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Covalent HTTP ${response.status}: ${text.substring(0, 200)}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(`Covalent API error: ${data.error_message || JSON.stringify(data.error)}`);
        }
        const items = ((_a = data.data) === null || _a === void 0 ? void 0 : _a.items) || [];
        const transactions = items.map((tx) => ({
            timeStamp: tx.block_signed_at
                ? String(Math.floor(new Date(tx.block_signed_at).getTime() / 1000))
                : "0",
            hash: tx.tx_hash || "",
            from: tx.from_address || "",
            to: tx.to_address || "",
            value: tx.value || "0",
            functionName: "",
            methodId: tx.input ? tx.input.substring(0, 10) : "",
            contractAddress: "",
            confirmations: "0",
            txreceipt_status: tx.successful ? "1" : "0",
            isError: tx.successful ? "0" : "1",
            gas: tx.gas_offered ? String(tx.gas_offered) : "0",
            gasPrice: tx.gas_price ? String(tx.gas_price) : "0",
            gasUsed: tx.gas_spent ? String(tx.gas_spent) : "0",
        }));
        console_1.logger.info("COVALENT", `${chain} Successfully fetched ${transactions.length} transactions`);
        return { status: "1", message: "OK", result: transactions };
    }
}
exports.CovalentProvider = CovalentProvider;
