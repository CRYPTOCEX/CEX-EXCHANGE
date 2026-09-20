"use strict";
const { createError } = require("@b/utils/error");
const funding = require("@b/utils/exchange-funding");
function validateDepositAddressResponse(response, methodKey) {
    if (!response || typeof response !== "object") return false;
    const result = response.address || response.Address ? response : response[methodKey];
    const address = result?.address || result?.Address;
    return typeof address === "string" && address.trim().length > 0;
}
function handleNetworkMapping(network) {
    return ({ TRON: "TRX", ETH: "ERC20", BSC: "BEP20", POLYGON: "MATIC" })[network] || network;
}
function handleNetworkMappingReverse(network) {
    return ({ TRX: "TRON", ERC20: "ETH", BEP20: "BSC", MATIC: "POLYGON" })[network] || network;
}
async function resolveExchangeDepositAddress(exchange, provider, code, networkId, ctx) {
    const currencies = await funding.loadFundingCurrencies(exchange, provider, code, "deposit");
    const currency = funding.findCurrency(currencies, code);
    const network = funding.resolveNetwork(currency, networkId);
    funding.validateFundingNetwork(currency, network, "deposit");
    const params = provider === "kraken" ? { method: network.id } : { network: provider === "coinbase" ? network.id : network.network };
    const accept = (result, scoped = false) => {
        if (!validateDepositAddressResponse(result)) return null;
        if (result.currency && result.currency !== currency.code) return null;
        if (result.network) {
            try {
                if (funding.resolveNetwork(currency, result.network).network !== network.network) return null;
            } catch { return null; }
        } else if (!scoped) return null;
        return { ...result, address: (result.address || result.Address).trim(), tag: result.tag ?? result.memo ?? result.Memo, network: network.network };
    };
    let lastError;
    const attempt = async operation => {
        try { return await operation(); }
        catch (error) {
            if (!["InvalidAddress", "AddressPending", "NotSupported"].includes(error.name)) throw error;
            lastError = error;
            return null;
        }
    };
    let address;
    if (exchange.has.fetchDepositAddress) address = accept(await attempt(() => exchange.fetchDepositAddress(code, params)), true);
    if (!address && exchange.has.fetchDepositAddressesByNetwork) {
        const results = await attempt(() => exchange.fetchDepositAddressesByNetwork(code, params));
        for (const [key, result] of Object.entries(results || {})) {
            address = accept({ ...result, network: result.network || key });
            if (address) break;
        }
    }
    if (!address && exchange.has.fetchDepositAddresses) {
        const results = await attempt(() => exchange.fetchDepositAddresses([code], params));
        for (const result of Object.values(results || {})) {
            address = accept(result);
            if (address) break;
        }
    }
    if (!address && exchange.has.createDepositAddress) address = accept(await attempt(() => exchange.createDepositAddress(code, params)), true);
    if (!address) throw createError({ statusCode: 503, message: lastError?.name === "AddressPending" ? "The exchange is preparing this deposit address; please try again later" : `No verified deposit address returned for ${code} on ${network.network}` });
    ctx?.debug(`Deposit address resolved for ${code}/${network.network} on ${provider}`);
    return address;
}
module.exports = { validateDepositAddressResponse, handleNetworkMapping, handleNetworkMappingReverse, resolveExchangeDepositAddress };
