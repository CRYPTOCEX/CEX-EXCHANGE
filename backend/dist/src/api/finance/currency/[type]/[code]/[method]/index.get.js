"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.validateDepositAddressResponse = validateDepositAddressResponse;
exports.handleNetworkMapping = handleNetworkMapping;
exports.handleNetworkMappingReverse = handleNetworkMappingReverse;
const error_1 = require("@b/utils/error");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const query_1 = require("@b/utils/query");
const utils_1 = require("@b/api/exchange/utils");
const utils_2 = require("../../../utils");
const console_1 = require("@b/utils/console");
function validateDepositAddressResponse(response, methodKey) {
    if (!response)
        return false;
    if (typeof response === 'object' && Object.keys(response).length === 0) {
        return false;
    }
    if (methodKey && response[methodKey]) {
        const methodResponse = response[methodKey];
        if (typeof methodResponse === 'object' && Object.keys(methodResponse).length === 0) {
            return false;
        }
        if (methodResponse && typeof methodResponse === 'object' && !methodResponse.address) {
            return false;
        }
    }
    else if (!methodKey) {
        if (typeof response === 'object' && !response.address && !response.tag && !response.memo) {
            return false;
        }
    }
    return true;
}
exports.metadata = {
    summary: "Retrieves a single currency by its ID",
    description: "This endpoint retrieves a single currency by its ID.",
    operationId: "getCurrencyById",
    tags: ["Finance", "Currency"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "type",
            in: "path",
            required: true,
            schema: {
                type: "string",
                enum: ["SPOT"],
            },
        },
        {
            index: 1,
            name: "code",
            in: "path",
            required: true,
            schema: {
                type: "string",
            },
        },
        {
            index: 2,
            name: "method",
            in: "path",
            required: false,
            schema: {
                type: "string",
            },
        },
    ],
    responses: {
        200: {
            description: "Currency retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...utils_2.baseResponseSchema,
                            data: {
                                type: "object",
                                properties: utils_2.baseCurrencySchema,
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Currency"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    const { type, code, method } = params;
    if (!type || !code)
        throw (0, error_1.createError)(400, "Invalid type or code");
    if (type !== "SPOT")
        throw (0, error_1.createError)(400, "Invalid type");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching deposit address for ${code}/${method}`);
    const exchange = await exchange_1.default.startExchange(ctx);
    const provider = await exchange_1.default.getProvider();
    if (!exchange)
        throw (0, error_1.createError)(500, "Exchange not found");
    if (!provider)
        throw (0, error_1.createError)(500, "Exchange provider not found");
    const getKuCoinNetworkId = async (currency, chainName) => {
        try {
            const currencies = await exchange.fetchCurrencies();
            const currencyData = Object.values(currencies).find((c) => c.id === currency || c.code === currency);
            if (currencyData && currencyData.networks) {
                const availableNetworks = Object.keys(currencyData.networks);
                if (availableNetworks.includes(chainName)) {
                    console_1.logger.debug("EXCHANGE", `[KuCoin] Network mapping: ${chainName} -> ${chainName}`);
                    return chainName;
                }
                const chainMappings = {
                    'ETH': 'ERC20',
                    'ETHEREUM': 'ERC20',
                    'BSC': 'BEP20',
                    'BINANCE': 'BEP20',
                    'TRX': 'TRC20',
                    'TRON': 'TRC20',
                    'POLYGON': 'POLYGON',
                    'MATIC': 'POLYGON',
                    'ARBITRUM': 'ARBITRUM',
                    'OPTIMISM': 'OPTIMISM',
                    'BASE': 'BASE',
                    'AVALANCHE': 'AVAX',
                    'AVAX': 'AVAX'
                };
                const mappedName = chainMappings[chainName.toUpperCase()];
                if (mappedName && availableNetworks.includes(mappedName)) {
                    console_1.logger.debug("EXCHANGE", `[KuCoin] Network mapping: ${chainName} -> ${mappedName}`);
                    return mappedName;
                }
                const caseInsensitiveMatch = availableNetworks.find(net => net.toLowerCase() === chainName.toLowerCase());
                if (caseInsensitiveMatch) {
                    console_1.logger.debug("EXCHANGE", `[KuCoin] Network mapping: ${chainName} -> ${caseInsensitiveMatch}`);
                    return caseInsensitiveMatch;
                }
                for (const [networkId, networkInfo] of Object.entries(currencyData.networks)) {
                    const network = networkInfo;
                    if (network.name === chainName ||
                        network.network === chainName ||
                        (network.name && network.name.toUpperCase() === chainName.toUpperCase()) ||
                        (network.network && network.network.toUpperCase() === chainName.toUpperCase())) {
                        console_1.logger.debug("EXCHANGE", `[KuCoin] Network mapping: ${chainName} -> ${networkId}`);
                        return networkId;
                    }
                }
            }
            console_1.logger.debug("EXCHANGE", `[KuCoin] No mapping found for ${chainName}, using as-is`);
            return chainName;
        }
        catch (error) {
            console_1.logger.error("EXCHANGE", `[KuCoin] Error in network mapping`, error);
            return chainName;
        }
    };
    const getExchangeNetworkId = async (currency, chainName, provider) => {
        try {
            const currencies = await exchange.fetchCurrencies();
            let currencyData;
            switch (provider) {
                case "xt":
                    currencyData = Object.values(currencies).find((c) => c.code === currency);
                    break;
                default:
                    currencyData = Object.values(currencies).find((c) => c.id === currency || c.code === currency);
                    break;
            }
            if (currencyData && currencyData.networks) {
                const availableNetworks = Object.keys(currencyData.networks);
                console_1.logger.debug("EXCHANGE", `[${provider}] Available networks for ${currency}: ${availableNetworks.join(", ")}`);
                if (availableNetworks.includes(chainName)) {
                    console_1.logger.debug("EXCHANGE", `[${provider}] Network mapping: ${chainName} -> ${chainName}`);
                    return chainName;
                }
                let chainMappings = {};
                if (provider === 'kucoin') {
                    chainMappings = {
                        'ETH': 'ERC20',
                        'ETHEREUM': 'ERC20',
                        'BSC': 'BEP20',
                        'BINANCE': 'BEP20',
                        'TRX': 'TRC20',
                        'TRON': 'TRC20',
                        'POLYGON': 'POLYGON',
                        'MATIC': 'POLYGON',
                        'ARBITRUM': 'ARBITRUM',
                        'OPTIMISM': 'OPTIMISM',
                        'BASE': 'BASE',
                        'AVALANCHE': 'AVAX',
                        'AVAX': 'AVAX'
                    };
                }
                else if (provider === 'binance') {
                    chainMappings = {
                        'ETH': 'ETH',
                        'ETHEREUM': 'ETH',
                        'BSC': 'BSC',
                        'BINANCE': 'BSC',
                        'BNB': 'BSC',
                        'TRX': 'TRX',
                        'TRON': 'TRX',
                        'POLYGON': 'MATIC',
                        'MATIC': 'MATIC',
                        'ARBITRUM': 'ARBITRUM',
                        'OPTIMISM': 'OPTIMISM',
                        'BASE': 'BASE',
                        'AVALANCHE': 'AVAXC',
                        'AVAX': 'AVAXC'
                    };
                }
                else if (provider === 'xt') {
                    chainMappings = {
                        'ETH': 'ERC20',
                        'ETHEREUM': 'ERC20',
                        'BSC': 'BEP20',
                        'BINANCE': 'BEP20',
                        'BNB': 'BEP20',
                        'TRX': 'TRC20',
                        'TRON': 'TRC20',
                        'POLYGON': 'POLYGON',
                        'MATIC': 'POLYGON',
                        'ARBITRUM': 'ARBITRUM',
                        'OPTIMISM': 'OPTIMISM',
                        'BASE': 'BASE',
                        'AVALANCHE': 'AVAX',
                        'AVAX': 'AVAX'
                    };
                }
                const mappedName = chainMappings[chainName.toUpperCase()];
                if (mappedName && availableNetworks.includes(mappedName)) {
                    console_1.logger.debug("EXCHANGE", `[${provider}] Network mapping: ${chainName} -> ${mappedName}`);
                    return mappedName;
                }
                const caseInsensitiveMatch = availableNetworks.find(net => net.toLowerCase() === chainName.toLowerCase());
                if (caseInsensitiveMatch) {
                    console_1.logger.debug("EXCHANGE", `[${provider}] Network mapping: ${chainName} -> ${caseInsensitiveMatch}`);
                    return caseInsensitiveMatch;
                }
                const partialMatch = availableNetworks.find(net => {
                    const netUpper = net.toUpperCase();
                    const chainUpper = chainName.toUpperCase();
                    return netUpper.includes(chainUpper) || chainUpper.includes(netUpper);
                });
                if (partialMatch) {
                    console_1.logger.debug("EXCHANGE", `[${provider}] Network mapping (partial): ${chainName} -> ${partialMatch}`);
                    return partialMatch;
                }
                for (const [networkId, networkInfo] of Object.entries(currencyData.networks)) {
                    const network = networkInfo;
                    if (network.name === chainName ||
                        network.network === chainName ||
                        (network.name && network.name.toUpperCase() === chainName.toUpperCase()) ||
                        (network.network && network.network.toUpperCase() === chainName.toUpperCase())) {
                        console_1.logger.debug("EXCHANGE", `[${provider}] Network mapping (by properties): ${chainName} -> ${networkId}`);
                        return networkId;
                    }
                }
                console_1.logger.debug("EXCHANGE", `[${provider}] No mapping found for ${chainName} in available networks: ${availableNetworks.join(", ")}`);
            }
            else {
                console_1.logger.debug("EXCHANGE", `[${provider}] No currency data or networks found for ${currency}`);
            }
            console_1.logger.debug("EXCHANGE", `[${provider}] No mapping found for ${chainName}, using as-is`);
            return chainName;
        }
        catch (error) {
            console_1.logger.error("EXCHANGE", `[${provider}] Error in network mapping`, error);
            return chainName;
        }
    };
    try {
        let networkToUse = method;
        if (method && ['kucoin', 'binance', 'xt'].includes(provider)) {
            if (provider === 'kucoin') {
                networkToUse = await getKuCoinNetworkId(code, method);
            }
            else {
                networkToUse = await getExchangeNetworkId(code, method, provider);
            }
            try {
                const currencies = await exchange.fetchCurrencies();
                let currencyData;
                switch (provider) {
                    case "xt":
                        currencyData = Object.values(currencies).find((c) => c.code === code);
                        break;
                    default:
                        currencyData = Object.values(currencies).find((c) => c.id === code || c.code === code);
                        break;
                }
                if (currencyData && currencyData.networks) {
                    Object.entries(currencyData.networks).forEach(([networkId, networkInfo]) => {
                        if (networkId === networkToUse) {
                            console_1.logger.debug("EXCHANGE", `[${provider}] Using network ${networkId} for ${code}: deposit=${networkInfo.deposit}, active=${networkInfo.active}`);
                        }
                    });
                }
            }
            catch (debugError) {
            }
        }
        let depositAddress;
        if (provider === 'kucoin') {
            try {
                if (!depositAddress && exchange.has['fetchDepositAddressesByNetwork']) {
                    try {
                        const result = await exchange.fetchDepositAddressesByNetwork(code, networkToUse);
                        if (result && typeof result === 'object' && Object.keys(result).length > 0) {
                            const networkResponse = result[networkToUse] || result;
                            if (networkResponse && (networkResponse.address || networkResponse.Address)) {
                                depositAddress = networkResponse;
                                console_1.logger.debug("EXCHANGE", `[${provider}] Method 1 Success: fetchDepositAddressesByNetwork for ${code}/${networkToUse}`);
                            }
                        }
                    }
                    catch (method1Error) {
                        console_1.logger.debug("EXCHANGE", `[${provider}] Method 1 Failed: fetchDepositAddressesByNetwork - ${method1Error.message}`);
                    }
                }
                if (!depositAddress && exchange.has['fetchDepositAddresses']) {
                    try {
                        const allAddresses = await exchange.fetchDepositAddresses(code);
                        if (allAddresses && typeof allAddresses === 'object') {
                            const networkAddress = allAddresses[networkToUse];
                            if (networkAddress && (networkAddress.address || networkAddress.Address)) {
                                depositAddress = networkAddress;
                                console_1.logger.debug("EXCHANGE", `[${provider}] Method 2 Success: fetchDepositAddresses for ${code}/${networkToUse}`);
                            }
                        }
                    }
                    catch (method2Error) {
                        console_1.logger.debug("EXCHANGE", `[${provider}] Method 2 Failed: fetchDepositAddresses - ${method2Error.message}`);
                    }
                }
                if (!depositAddress && exchange.has['createDepositAddress']) {
                    try {
                        const result = await exchange.createDepositAddress(code, { network: networkToUse });
                        if (result && (result.address || result.Address)) {
                            depositAddress = result;
                            console_1.logger.debug("EXCHANGE", `[${provider}] Method 3 Success: createDepositAddress for ${code}/${networkToUse}`);
                        }
                    }
                    catch (createError) {
                        console_1.logger.debug("EXCHANGE", `[${provider}] Method 3 Failed: createDepositAddress - ${createError.message}`);
                    }
                }
                if (!depositAddress && exchange.has['fetchDepositAddress']) {
                    try {
                        const result = await exchange.fetchDepositAddress(code, { network: networkToUse });
                        if (result && (result.address || result.Address)) {
                            depositAddress = result;
                            console_1.logger.debug("EXCHANGE", `[${provider}] Method 4 Success: fetchDepositAddress with network for ${code}/${networkToUse}`);
                        }
                    }
                    catch (method3Error) {
                        console_1.logger.debug("EXCHANGE", `[${provider}] Method 4 Failed: fetchDepositAddress with network - ${method3Error.message}`);
                    }
                }
                if (!depositAddress && exchange.has['fetchDepositAddress']) {
                    try {
                        const simpleAddress = await exchange.fetchDepositAddress(code);
                        if (simpleAddress && (simpleAddress.address || simpleAddress.Address)) {
                            depositAddress = simpleAddress;
                            console_1.logger.debug("EXCHANGE", `[${provider}] Method 5 Success: fetchDepositAddress simple for ${code}`);
                        }
                    }
                    catch (method4Error) {
                        console_1.logger.debug("EXCHANGE", `[${provider}] Method 5 Failed: fetchDepositAddress simple - ${method4Error.message}`);
                    }
                }
                if (!depositAddress) {
                    console_1.logger.warn("EXCHANGE", `[${provider}] All methods failed to generate deposit address for ${code}/${networkToUse}`);
                    throw (0, error_1.createError)({ statusCode: 500, message: `${provider} exchange does not support deposit address generation for ${code}/${networkToUse}. Available methods: ${Object.keys(exchange.has).filter(method => method.includes('Deposit')).join(', ')}` });
                }
            }
            catch (kucoinError) {
                console_1.logger.error("EXCHANGE", `[${provider}] Error during deposit address fetching`, kucoinError);
                throw kucoinError;
            }
        }
        else {
            try {
                if (exchange.has["fetchDepositAddressesByNetwork"]) {
                    depositAddress = await exchange.fetchDepositAddressesByNetwork(code, networkToUse);
                    if (!depositAddress || !validateDepositAddressResponse(depositAddress, networkToUse)) {
                        throw (0, error_1.createError)({ statusCode: 500, message: "fetchDepositAddressesByNetwork returned invalid data" });
                    }
                    const networkResponse = depositAddress[networkToUse] || depositAddress;
                    if (networkResponse && (networkResponse.address || networkResponse.Address)) {
                        depositAddress = networkResponse;
                    }
                }
                else if (exchange.has["fetchDepositAddresses"]) {
                    const depositAddresses = await exchange.fetchDepositAddresses(code);
                    if (!depositAddresses)
                        throw (0, error_1.createError)({ statusCode: 500, message: "fetchDepositAddresses returned no data" });
                    depositAddress = depositAddresses[networkToUse];
                    if (!depositAddress)
                        throw (0, error_1.createError)({ statusCode: 404, message: `No address found for network ${networkToUse}` });
                }
                else if (exchange.has["fetchDepositAddress"]) {
                    let network = networkToUse;
                    if (provider === "xt") {
                        network = handleNetworkMapping(network);
                    }
                    depositAddress = await exchange.fetchDepositAddress(code, { network });
                    if (!depositAddress)
                        throw (0, error_1.createError)({ statusCode: 500, message: "fetchDepositAddress returned no data" });
                }
                else {
                    throw (0, error_1.createError)({ statusCode: 500, message: `Exchange ${provider} does not support any deposit address methods` });
                }
            }
            catch (error) {
                console_1.logger.error("EXCHANGE", `[${provider}] Error during deposit address fetching`, error);
                throw error;
            }
        }
        if (!validateDepositAddressResponse(depositAddress, networkToUse)) {
            throw (0, error_1.createError)(500, (0, utils_1.sanitizeErrorMessage)("Deposit address generation failed. The exchange returned invalid or empty address data. Please try again later or contact support."));
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Deposit address retrieved for ${code}/${method}`);
        return { ...depositAddress, trx: true };
    }
    catch (error) {
        if (error.statusCode) {
            throw error;
        }
        console_1.logger.error("EXCHANGE", `[${provider}] Error for ${code}/${method}`, error);
        const message = (0, utils_1.sanitizeErrorMessage)(error.message);
        throw (0, error_1.createError)(404, message);
    }
};
function handleNetworkMapping(network) {
    switch (network) {
        case "TRON":
            return "TRX";
        case "ETH":
            return "ERC20";
        case "BSC":
            return "BEP20";
        case "POLYGON":
            return "MATIC";
        default:
            return network;
    }
}
function handleNetworkMappingReverse(network) {
    switch (network) {
        case "TRX":
            return "TRON";
        case "ERC20":
            return "ETH";
        case "BEP20":
            return "BSC";
        case "MATIC":
            return "POLYGON";
        default:
            return network;
    }
}
