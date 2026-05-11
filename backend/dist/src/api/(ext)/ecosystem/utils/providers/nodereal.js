"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeRealProvider = void 0;
const console_1 = require("@b/utils/console");
const NODEREAL_RPC_MAP = {
    BSC: "bsc-mainnet",
    ETH: "eth-mainnet",
};
class NodeRealProvider {
    constructor() {
        this.name = "nodereal";
    }
    supports(chain) {
        return chain in NODEREAL_RPC_MAP;
    }
    async fetchTransactions(config) {
        var _a, _b;
        const { chain, address } = config;
        const apiKey = process.env.NODEREAL_API_KEY;
        if (!apiKey) {
            throw new Error("NODEREAL_API_KEY is not set");
        }
        const networkSlug = NODEREAL_RPC_MAP[chain];
        if (!networkSlug) {
            throw new Error(`NodeReal does not support chain: ${chain}`);
        }
        const url = `https://${networkSlug}.nodereal.io/v1/${apiKey}`;
        console_1.logger.info("NODEREAL", `${chain} Fetching transactions for ${address.substring(0, 10)}...`);
        const [incomingRes, outgoingRes] = await Promise.all([
            fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "nr_getAssetTransfers",
                    params: [
                        {
                            toAddress: address,
                            category: ["external"],
                            fromBlock: "0x0",
                            toBlock: "latest",
                            order: "desc",
                            maxCount: "0x32",
                            excludeZeroValue: true,
                        },
                    ],
                    id: 1,
                }),
            }),
            fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "nr_getAssetTransfers",
                    params: [
                        {
                            fromAddress: address,
                            category: ["external"],
                            fromBlock: "0x0",
                            toBlock: "latest",
                            order: "desc",
                            maxCount: "0x32",
                            excludeZeroValue: true,
                        },
                    ],
                    id: 2,
                }),
            }),
        ]);
        if (!incomingRes.ok || !outgoingRes.ok) {
            const text = await (incomingRes.ok ? outgoingRes : incomingRes).text();
            throw new Error(`NodeReal HTTP error: ${text.substring(0, 200)}`);
        }
        const [incomingData, outgoingData] = await Promise.all([
            incomingRes.json(),
            outgoingRes.json(),
        ]);
        if (incomingData.error) {
            throw new Error(`NodeReal API error: ${incomingData.error.message || JSON.stringify(incomingData.error)}`);
        }
        const allTransfers = [
            ...(((_a = incomingData.result) === null || _a === void 0 ? void 0 : _a.transfers) || []),
            ...(((_b = outgoingData.result) === null || _b === void 0 ? void 0 : _b.transfers) || []),
        ];
        const seen = new Set();
        const uniqueTransfers = allTransfers.filter((tx) => {
            const hash = tx.hash || tx.transactionHash || "";
            if (seen.has(hash))
                return false;
            seen.add(hash);
            return true;
        });
        const transactions = uniqueTransfers.map((tx) => {
            var _a, _b;
            const valueHex = tx.value || ((_a = tx.rawContract) === null || _a === void 0 ? void 0 : _a.value) || "0x0";
            const value = typeof valueHex === "string" && valueHex.startsWith("0x")
                ? BigInt(valueHex).toString()
                : valueHex;
            return {
                timeStamp: ((_b = tx.metadata) === null || _b === void 0 ? void 0 : _b.blockTimestamp)
                    ? String(Math.floor(new Date(tx.metadata.blockTimestamp).getTime() / 1000))
                    : "0",
                hash: tx.hash || tx.transactionHash || "",
                from: tx.from || "",
                to: tx.to || "",
                value,
                functionName: "",
                methodId: "",
                contractAddress: "",
                confirmations: "0",
                txreceipt_status: "1",
                isError: "0",
                gas: "0",
                gasPrice: "0",
                gasUsed: "0",
            };
        });
        console_1.logger.info("NODEREAL", `${chain} Successfully fetched ${transactions.length} transactions`);
        return { status: "1", message: "OK", result: transactions };
    }
}
exports.NodeRealProvider = NodeRealProvider;
