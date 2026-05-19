"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoralisProvider = void 0;
const console_1 = require("@b/utils/console");
const MORALIS_CHAIN_MAP = {
    ETH: "0x1",
    BSC: "0x38",
    POLYGON: "0x89",
    ARBITRUM: "0xa4b1",
    OPTIMISM: "0xa",
    BASE: "0x2105",
    AVAX: "0xa86a",
    FTM: "0xfa",
    LINEA: "0xe708",
    CELO: "0xa4ec",
};
class MoralisProvider {
    constructor() {
        this.name = "moralis";
    }
    supports(chain) {
        return chain in MORALIS_CHAIN_MAP;
    }
    async fetchTransactions(config) {
        const { chain, address } = config;
        const apiKey = process.env.MORALIS_API_KEY;
        if (!apiKey) {
            throw new Error("MORALIS_API_KEY is not set");
        }
        const chainHex = MORALIS_CHAIN_MAP[chain];
        if (!chainHex) {
            throw new Error(`Moralis does not support chain: ${chain}`);
        }
        const url = `https://deep-index.moralis.io/api/v2.2/${address}?chain=${chainHex}&order=DESC&limit=50`;
        console_1.logger.info("MORALIS", `${chain} Fetching transactions for ${address.substring(0, 10)}...`);
        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
                "X-API-Key": apiKey,
            },
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Moralis HTTP ${response.status}: ${text.substring(0, 200)}`);
        }
        const data = await response.json();
        const transactions = (data.result || []).map((tx) => ({
            timeStamp: tx.block_timestamp
                ? String(Math.floor(new Date(tx.block_timestamp).getTime() / 1000))
                : "0",
            hash: tx.hash || "",
            from: tx.from_address || "",
            to: tx.to_address || "",
            value: tx.value || "0",
            functionName: "",
            methodId: tx.input ? tx.input.substring(0, 10) : "",
            contractAddress: "",
            confirmations: "0",
            txreceipt_status: tx.receipt_status === "1" ? "1" : "0",
            isError: tx.receipt_status === "0" ? "1" : "0",
            gas: tx.gas ? String(tx.gas) : "0",
            gasPrice: tx.gas_price || "0",
            gasUsed: tx.receipt_gas_used ? String(tx.receipt_gas_used) : "0",
        }));
        console_1.logger.info("MORALIS", `${chain} Successfully fetched ${transactions.length} transactions`);
        return { status: "1", message: "OK", result: transactions };
    }
}
exports.MoralisProvider = MoralisProvider;
