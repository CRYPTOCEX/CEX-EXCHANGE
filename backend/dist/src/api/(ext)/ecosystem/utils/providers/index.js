"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWithProviders = fetchWithProviders;
const console_1 = require("@b/utils/console");
const etherscan_1 = require("./etherscan");
const ankr_1 = require("./ankr");
const moralis_1 = require("./moralis");
const covalent_1 = require("./covalent");
const nodereal_1 = require("./nodereal");
const ALL_PROVIDERS = {
    etherscan: new etherscan_1.EtherscanProvider(),
    ankr: new ankr_1.AnkrProvider(),
    moralis: new moralis_1.MoralisProvider(),
    covalent: new covalent_1.CovalentProvider(),
    nodereal: new nodereal_1.NodeRealProvider(),
};
const DEFAULT_PROVIDER_ORDER = [
    "etherscan",
    "ankr",
    "moralis",
    "covalent",
    "nodereal",
];
function getProviderOrder() {
    const envProviders = process.env.TRANSACTION_PROVIDERS;
    if (envProviders) {
        return envProviders
            .split(",")
            .map((p) => p.trim().toLowerCase())
            .filter((p) => p in ALL_PROVIDERS);
    }
    return DEFAULT_PROVIDER_ORDER;
}
async function fetchWithProviders(config) {
    const providerOrder = getProviderOrder();
    const errors = [];
    for (const providerName of providerOrder) {
        const provider = ALL_PROVIDERS[providerName];
        if (!provider)
            continue;
        if (!provider.supports(config.chain)) {
            console_1.logger.debug("PROVIDERS", `${providerName} does not support chain ${config.chain}, skipping`);
            continue;
        }
        try {
            console_1.logger.info("PROVIDERS", `Trying ${providerName} for ${config.chain}...`);
            const result = await provider.fetchTransactions(config);
            console_1.logger.info("PROVIDERS", `${providerName} succeeded for ${config.chain}`);
            return result;
        }
        catch (error) {
            const msg = error.message || String(error);
            errors.push(`${providerName}: ${msg}`);
            console_1.logger.error("PROVIDERS", `${providerName} failed for ${config.chain}: ${msg}`);
        }
    }
    const errorSummary = errors.join("; ");
    console_1.logger.error("PROVIDERS", `All providers failed for ${config.chain}: ${errorSummary}`);
    throw new Error(`All transaction providers failed for ${config.chain}. Errors: ${errorSummary}`);
}
