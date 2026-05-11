"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnkrProvider = void 0;
const console_1 = require("@b/utils/console");
const ANKR_CHAIN_MAP = {
    ETH: "eth",
    BSC: "bsc",
    POLYGON: "polygon",
    ARBITRUM: "arbitrum",
    OPTIMISM: "optimism",
    BASE: "base",
    AVAX: "avalanche",
    FTM: "fantom",
    LINEA: "linea",
    CELO: "celo",
};
class AnkrProvider {
    constructor() {
        this.name = "ankr";
    }
    supports(chain) {
        return chain in ANKR_CHAIN_MAP;
    }
    async fetchTransactions(config) {
        var _a;
        const { chain, address } = config;
        const apiKey = process.env.ANKR_API_KEY;
        if (!apiKey) {
            throw new Error("ANKR_API_KEY is not set");
        }
        const ankrChain = ANKR_CHAIN_MAP[chain];
        if (!ankrChain) {
            throw new Error(`Ankr does not support chain: ${chain}`);
        }
        const url = `https://rpc.ankr.com/multichain/${apiKey}`;
        console_1.logger.info("ANKR", `${chain} Fetching transactions for ${address.substring(0, 10)}...`);
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "ankr_getTransactionsByAddress",
                params: {
                    blockchain: ankrChain,
                    address: [address],
                    pageSize: 50,
                    descOrder: true,
                },
                id: 1,
            }),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Ankr HTTP ${response.status}: ${text.substring(0, 200)}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(`Ankr API error: ${data.error.message || JSON.stringify(data.error)}`);
        }
        const transactions = (((_a = data.result) === null || _a === void 0 ? void 0 : _a.transactions) || []).map((tx) => ({
            timeStamp: tx.timestamp
                ? String(typeof tx.timestamp === "string" && tx.timestamp.startsWith("0x")
                    ? parseInt(tx.timestamp, 16)
                    : Math.floor(new Date(tx.timestamp).getTime() / 1000))
                : "0",
            hash: tx.hash || tx.transactionHash || "",
            from: tx.from || "",
            to: tx.to || "",
            value: tx.value
                ? typeof tx.value === "string" && tx.value.startsWith("0x")
                    ? BigInt(tx.value).toString()
                    : tx.value
                : "0",
            functionName: "",
            methodId: tx.input ? tx.input.substring(0, 10) : "",
            contractAddress: tx.contractAddress || "",
            confirmations: tx.confirmations || "0",
            txreceipt_status: tx.status === "0x1" || tx.status === 1 ? "1" : "0",
            isError: tx.status === "0x0" || tx.status === 0 ? "1" : "0",
            gas: tx.gas
                ? typeof tx.gas === "string" && tx.gas.startsWith("0x")
                    ? parseInt(tx.gas, 16).toString()
                    : tx.gas
                : "0",
            gasPrice: tx.gasPrice
                ? typeof tx.gasPrice === "string" && tx.gasPrice.startsWith("0x")
                    ? BigInt(tx.gasPrice).toString()
                    : tx.gasPrice
                : "0",
            gasUsed: tx.gasUsed
                ? typeof tx.gasUsed === "string" && tx.gasUsed.startsWith("0x")
                    ? parseInt(tx.gasUsed, 16).toString()
                    : tx.gasUsed
                : "0",
        }));
        console_1.logger.info("ANKR", `${chain} Successfully fetched ${transactions.length} transactions`);
        return { status: "1", message: "OK", result: transactions };
    }
}
exports.AnkrProvider = AnkrProvider;
