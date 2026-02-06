"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const https_1 = __importDefault(require("https"));
exports.metadata = {
    summary: "Fetch patch notes for a specific product",
    operationId: "getProductPatchNotes",
    tags: ["Admin", "System"],
    parameters: [
        {
            name: "productId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Product ID or type name (e.g., 'core', 'ai-investment', '35599184')",
        },
    ],
    responses: {
        200: {
            description: "Product patch notes fetched successfully",
        },
    },
    permission: "access.admin",
};
const DOCS_BASE_URL = "https://docs.mashdiv.com/patch-notes";
const PRODUCT_ID_TO_TYPE = {
    "35599184": "core",
    "35988984": "ai-investment",
    "61007981": "ai-market-maker",
    "40071914": "ecosystem",
    "36668679": "forex",
    "36120046": "ico",
    "37434481": "staking",
    "39166202": "faq",
    "44624493": "ecommerce",
    "37548018": "wallet-connect",
    "44593497": "p2p",
    "36667808": "affiliate",
    "45613491": "mailwizard",
    "46094641": "futures",
    "60962133": "nft",
    "61043226": "gateway",
    "61107157": "copy-trading",
    "61200000": "chart-engine",
    "37179816": "exchange-kucoin",
    "38650585": "exchange-binance",
    "54510301": "exchange-xt",
    "54514052": "blockchain-solana",
    "54577641": "blockchain-tron",
    "54578959": "blockchain-monero",
    "55715370": "blockchain-ton",
};
exports.default = async (data) => {
    const { productId } = data.params;
    const type = PRODUCT_ID_TO_TYPE[productId] || productId;
    try {
        const url = `${DOCS_BASE_URL}/${type}.json`;
        const patchNotes = await fetchPatchNotes(url);
        return patchNotes;
    }
    catch (error) {
        return null;
    }
};
function fetchPatchNotes(url) {
    return new Promise((resolve, reject) => {
        https_1.default
            .get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            let data = "";
            res.on("data", (chunk) => {
                data += chunk;
            });
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (e) {
                    reject(new Error("Invalid JSON response"));
                }
            });
            res.on("error", reject);
        })
            .on("error", reject);
    });
}
