"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EtherscanProvider = void 0;
const console_1 = require("@b/utils/console");
class EtherscanProvider {
    constructor() {
        this.name = "etherscan";
    }
    supports(chain) {
        return true;
    }
    async fetchTransactions(config) {
        const { chain, address, apiKey, explorerUrl } = config;
        if (!explorerUrl) {
            throw new Error(`No explorer URL configured for chain ${chain}`);
        }
        if (!apiKey) {
            throw new Error(`No API key for ${chain}. Set ${chain}_EXPLORER_API_KEY or ETHERSCAN_API_KEY`);
        }
        const url = `https://${explorerUrl}/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
        console_1.logger.info("ETHERSCAN", `${chain} Fetching transactions for ${address.substring(0, 10)}... via ${explorerUrl}`);
        const response = await fetch(url);
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
        }
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            const text = await response.text();
            throw new Error(`Received HTML instead of JSON from ${explorerUrl}: ${text.substring(0, 200)}`);
        }
        const data = await response.json();
        if (data.status === "0" && data.message === "NOTOK") {
            console_1.logger.warn("ETHERSCAN", `${chain} API error: ${data.result}`);
            throw new Error(`${chain} explorer API error: ${data.result}`);
        }
        if (!data.result || !Array.isArray(data.result)) {
            console_1.logger.warn("ETHERSCAN", `${chain} Unexpected response format, returning empty results`);
            return { status: "1", message: "OK", result: [] };
        }
        console_1.logger.info("ETHERSCAN", `${chain} Successfully fetched ${data.result.length} transactions`);
        return data;
    }
}
exports.EtherscanProvider = EtherscanProvider;
