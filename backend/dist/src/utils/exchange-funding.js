"use strict";
const { createError } = require("@b/utils/error");
const SUPPORTED_PROVIDERS = ["kucoin", "binance", "binanceus", "kraken", "okx", "xt", "bybit", "mexc", "gate", "bitget", "coinbase", "htx", "upbit", "cryptocom", "bitfinex", "lbank"];
function fail(message, statusCode = 400) {
    throw createError({ statusCode, message });
}
function precisionDecimals(raw, mode = 4, fallback = 8) {
    if (raw && typeof raw === "object") raw = raw.amount ?? raw.precision ?? raw.tickSize ?? raw.price;
    if (raw === undefined || raw === null || raw === "") return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return fallback;
    if (mode === 2) return Math.min(Math.trunc(value), 18);
    if (mode === 3) return fallback;
    if (value === 0) return fallback;
    const [coefficient, exponent = "0"] = String(value).toLowerCase().split("e");
    return Math.min(18, Math.max(0, (coefficient.split(".")[1] || "").length - Number(exponent)));
}
function findCurrency(currencies, code) {
    const wanted = String(code).toUpperCase();
    const values = Object.values(currencies || {});
    return values.find(currency => String(currency.code || "").toUpperCase() === wanted) ||
        values.find(currency => String(currency.id || "").toUpperCase() === wanted);
}
function matchesDepositCurrency(code, deposit) {
    return typeof deposit?.currency === "string" && deposit.currency === code && (!deposit.type || deposit.type === "deposit");
}
function networkToken(value) {
    const token = String(value || "").trim().toUpperCase();
    return ({ ERC20: "ETH", TRC20: "TRX", TRON: "TRX", BEP20: "BSC", POLYGON: "MATIC" })[token] || token;
}
function resolveNetwork(currency, requested) {
    if (!requested || typeof requested !== "string") fail("An explicit exchange network is required");
    const entries = Object.entries(currency?.networks || {});
    const exact = entries.filter(([key, network]) => [key, network.id, network.network, network.name].some(value => value != null && String(value).toUpperCase() === requested.toUpperCase()));
    const matches = exact.length ? exact : entries.filter(([key, network]) => [key, network.id, network.network].some(value => networkToken(value) === networkToken(requested)));
    if (matches.length !== 1) fail(`Network ${requested} is unavailable or ambiguous for ${currency?.code || "this currency"}`);
    const [key, network] = matches[0];
    return { ...network, network: key };
}
function installFundingCapabilities(exchange) {
    if (exchange.id === "bitfinex" && exchange.has.fetchDepositsWithdrawals) {
        for (const [method, type] of [["fetchDeposits", "deposit"], ["fetchWithdrawals", "withdrawal"]]) {
            exchange[method] = async (code, since, limit, params = {}) => {
                const rows = await exchange.fetchDepositsWithdrawals(code, since, limit, params);
                return rows.filter(row => row.type === type);
            };
            exchange.has[method] = "emulated";
        }
    }
    if (exchange.id === "lbank") {
        if (exchange.urls?.api?.rest === "https://api.lbank.info") exchange.urls.api.rest = "https://api.lbkex.com";
        for (const method of ["fetchDeposits", "fetchWithdrawals"]) {
            if (typeof exchange[method] === "function") exchange.has[method] = true;
        }
    }
    return exchange;
}
function assertFunding(exchange, provider, action) {
    if (!SUPPORTED_PROVIDERS.includes(provider)) fail(`Unsupported exchange provider: ${provider}`);
    if (!exchange.checkRequiredCredentials(false)) fail(`${provider} needs valid API credentials for ${action}`, 503);
    const history = action === "deposit" ? "fetchDeposits" : "fetchWithdrawals";
    if (!exchange.has[history]) fail(`${provider} cannot safely reconcile ${action} transactions`, 503);
    if (action === "withdraw" && !exchange.has.withdraw) fail(`${provider} does not support API withdrawals`, 503);
}
async function loadFundingCurrencies(exchange, provider, code, action) {
    assertFunding(exchange, provider, action);
    await exchange.loadMarkets();
    let currencies = exchange.has.fetchCurrencies ? await exchange.fetchCurrencies() : exchange.currencies;
    if (provider === "upbit") {
        const statuses = await exchange.privateGetStatusWallet();
        currencies = Object.fromEntries(Object.entries(currencies || {}).map(([key, currency]) => [key, { ...currency, networks: {} }]));
        for (const status of statuses) {
            const currencyCode = exchange.safeCurrencyCode(status.currency);
            const currency = currencies[currencyCode] = { ...currencies[currencyCode], code: currencyCode, id: status.currency, networks: { ...(currencies[currencyCode]?.networks || {}) } };
            const network = status.net_type;
            if (!network) continue;
            currency.networks[network] = { id: network, network, name: status.network_name || network, deposit: ["working", "deposit_only"].includes(status.wallet_state), withdraw: ["working", "withdraw_only"].includes(status.wallet_state), info: status };
        }
    }
    const currency = findCurrency(currencies, code);
    if (!currency) fail(`${code} is not available on ${provider}`, 404);
    if (currency.active === false || currency[action] === false) fail(`${action} is disabled for ${code} on ${provider}`);
    if (provider === "kraken") {
        const response = action === "deposit" ? await exchange.fetchDepositMethods(code) : (await exchange.privatePostWithdrawMethods({ asset: currency.id })).result;
        currency.networks = Object.fromEntries((response || []).map(method => [method.method, { id: method.method, network: method.method, deposit: action === "deposit", withdraw: action === "withdraw", fee: method.fee, precision: currency.precision, info: method }]));
    }
    exchange.currencies = { ...exchange.currencies, ...currencies };
    return currencies;
}
function validateFundingNetwork(currency, network, action) {
    if (currency.active === false || currency[action] === false || network.active === false || network[action] === false) fail(`${action} is disabled on ${network.network}`);
}
async function prepareWithdrawal(exchange, provider, code, chain, address, memo, amount) {
    if (typeof exchange.checkAddress === "function") exchange.checkAddress(address);
    const currencies = await loadFundingCurrencies(exchange, provider, code, "withdraw");
    const currency = findCurrency(currencies, code);
    const network = resolveNetwork(currency, chain);
    validateFundingNetwork(currency, network, "withdraw");
    const params = { network: network.network };
    if (provider === "coinbase") params.network = network.id;
    if (provider === "bitfinex") params.wallet = "exchange";
    let fee = network.fee ?? network.fees?.withdraw ?? currency.fee;
    if (provider === "coinbase") {
        const quote = await exchange.privateGetWithdrawalsFeeEstimate({ currency: currency.id, crypto_address: address, network: network.id });
        fee = quote.fee;
        params.add_network_fee_to_total = false;
    }
    if (provider === "upbit") {
        const quote = await exchange.privateGetWithdrawsChance({ currency: currency.id, net_type: network.id });
        if (quote.member_level?.locked || quote.member_level?.wallet_locked || quote.withdraw_limit?.can_withdraw === false) fail("Upbit has disabled withdrawals for this account or network");
        fee = quote.currency?.withdraw_fee;
        network.limits = { ...network.limits, withdraw: { min: quote.withdraw_limit?.minimum, max: quote.withdraw_limit?.onetime } };
        if (quote.withdraw_limit?.remaining_daily != null) {
            const remaining = Number(quote.withdraw_limit.remaining_daily);
            if (!Number.isFinite(remaining) || remaining <= 0) fail("Upbit daily withdrawal allowance is exhausted");
            network.limits.withdraw.max = Math.min(Number(network.limits.withdraw.max ?? remaining), remaining);
        }
    }
    if (provider === "lbank" && fee == null && exchange.has.fetchDepositWithdrawFees) {
        const fees = await exchange.fetchDepositWithdrawFees([code]);
        fee = fees?.[code]?.networks?.[network.network]?.withdraw?.fee;
    }
    if (provider === "okx" || provider === "lbank") {
        if (fee == null || !Number.isFinite(Number(fee)) || Number(fee) < 0) fail(`A verified network withdrawal fee is required for ${provider}`, 503);
        params.fee = String(fee);
    }
    if (provider === "kraken") {
        if (memo != null && String(memo).trim() !== "") fail("Kraken memo withdrawals require a separately verified saved withdrawal key; this form cannot verify that memo", 400);
        const response = await exchange.privatePostWithdrawAddresses({ asset: currency.id, method: network.id, verified: true });
        const matches = (response.result || []).filter(entry => entry.address === address && entry.method === network.id && entry.verified === true && entry.key);
        if (matches.length !== 1) fail("The destination must match exactly one verified Kraken withdrawal address on the selected network");
        params.key = matches[0].key;
        delete params.network;
        if (Number(amount) > 0) {
            const quote = await exchange.privatePostWithdrawInfo({ asset: currency.id, key: params.key, amount: String(amount) });
            fee = quote.result?.fee ?? fee;
        }
    }
    if (fee == null || !Number.isFinite(Number(fee)) || Number(fee) < 0) fail(`A verified network withdrawal fee is unavailable for ${provider}`, 503);
    return { currency, network, params, fee: Number(fee) };
}
function validateWithdrawalAmount(exchange, currency, network, amount, fallback = 8) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) fail("Amount must be a finite positive number");
    const precision = precisionDecimals(network.precision ?? currency.precision, exchange.precisionMode, fallback);
    if (typeof exchange.currencyToPrecision === "function") {
        const formatted = Number(exchange.currencyToPrecision(currency.code, value, network.network));
        if (!Number.isFinite(formatted) || formatted !== value) fail(`Amount exceeds ${currency.code} precision on ${network.network}`);
    } else if (precisionDecimals(value) > precision) fail("Amount exceeds currency precision");
    const minimum = network.limits?.withdraw?.min ?? network.min_withdraw ?? currency.limits?.withdraw?.min;
    const maximum = network.limits?.withdraw?.max ?? network.max_withdraw ?? currency.limits?.withdraw?.max;
    if (minimum != null && value < Number(minimum)) fail(`Minimum withdrawal is ${minimum}`);
    if (maximum != null && Number(maximum) > 0 && value > Number(maximum)) fail(`Maximum withdrawal is ${maximum}`);
    return precision;
}
module.exports = { SUPPORTED_PROVIDERS, precisionDecimals, findCurrency, matchesDepositCurrency, networkToken, resolveNetwork, installFundingCapabilities, assertFunding, loadFundingCurrencies, validateFundingNetwork, prepareWithdrawal, validateWithdrawalAmount };
