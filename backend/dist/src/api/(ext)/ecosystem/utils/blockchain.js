"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bitcoinCashNetwork = exports.dashNetwork = exports.dogecoinNetwork = exports.litecoinNetwork = exports.BigIntReplacer = exports.extractTransactionInfo = void 0;
exports.getTokenDecimal = getTokenDecimal;
exports.decodeTransactionData = decodeTransactionData;
exports.toBigInt = toBigInt;
exports.toBigIntFloat = toBigIntFloat;
exports.removeTolerance = removeTolerance;
exports.fromBigInt = fromBigInt;
exports.fromBigIntWithoutDivide = fromBigIntWithoutDivide;
exports.fromBigIntMultiply = fromBigIntMultiply;
exports.fromWei = fromWei;
exports.toWei = toWei;
exports.convertBigInt = convertBigInt;
exports.cacheTokenDecimals = cacheTokenDecimals;
exports.getCachedTokenDecimals = getCachedTokenDecimals;
exports.standardUnitToSatoshi = standardUnitToSatoshi;
exports.satoshiToStandardUnit = satoshiToStandardUnit;
const bignumber_js_1 = require("bignumber.js");
const redis_1 = require("./redis");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
async function getTokenDecimal() {
    try {
        const tokens = await db_1.models.ecosystemToken.findAll({
            attributes: ["currency", "decimals"],
        });
        return tokens.reduce((acc, token) => {
            acc[token.currency] = token.decimals;
            return acc;
        }, {});
    }
    catch (error) {
        console_1.logger.error("ECOSYSTEM", "Failed to fetch token decimals", error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch token decimals: ${error.message}` });
    }
}
const extractTransactionInfo = (tx) => {
    let targetAddress = null;
    let details = null;
    if (tx.data.startsWith("0x")) {
        if (tx.data === "0x") {
            targetAddress = tx.to;
            details = "Direct transfer of main blockchain token";
        }
        else {
            const methodID = tx.data.substring(0, 10);
            switch (methodID) {
                case "0xa9059cbb": {
                    targetAddress = `0x${tx.data.substring(34, 74)}`.toLowerCase();
                    const amount = parseInt(tx.data.substring(74, 138), 16);
                    details = `ERC20 token transfer of ${amount} tokens`;
                    break;
                }
                case "0xf340fa01":
                    targetAddress = `0x${tx.data.substring(34, 74)}`.toLowerCase();
                    details = "Deposit with an upline";
                    break;
                default:
                    details = "Unknown function";
                    break;
            }
        }
    }
    return { targetAddress, details };
};
exports.extractTransactionInfo = extractTransactionInfo;
function decodeTransactionData(data) {
    if (data.startsWith("0xa9059cbb")) {
        const to = "0x" + data.slice(34, 74);
        const amount = BigInt(`0x${data.slice(74, 138)}`);
        return { type: "ERC20", to, amount };
    }
    else if (data.startsWith("0xf340fa01")) {
        const to = "0x" + data.slice(34, 74);
        return { type: "Deposit", to };
    }
    else if (data === "0x") {
        return { type: "Native" };
    }
    else {
        return { type: "Unknown" };
    }
}
function toBigInt(value) {
    const bigNumber = new bignumber_js_1.BigNumber(value);
    const scaledNumber = bigNumber.shiftedBy(18);
    return BigInt(scaledNumber.toFixed());
}
function toBigIntFloat(number) {
    const bigNumber = new bignumber_js_1.BigNumber(number);
    const scaledNumber = bigNumber.shiftedBy(18);
    return BigInt(scaledNumber.toFixed(0));
}
function removeTolerance(bigintValue, toleranceDigits = 2) {
    const bigNumberValue = new bignumber_js_1.BigNumber(bigintValue.toString());
    const tolerance = new bignumber_js_1.BigNumber(10).pow(toleranceDigits);
    if (bigNumberValue.isLessThan(tolerance)) {
        return bigintValue;
    }
    return BigInt(bigNumberValue
        .dividedToIntegerBy(tolerance)
        .multipliedBy(tolerance)
        .toFixed());
}
function fromBigInt(value) {
    if (value === null) {
        return 0;
    }
    const bigNumberValue = new bignumber_js_1.BigNumber(value.toString());
    return bigNumberValue.shiftedBy(-18).toNumber();
}
function fromBigIntWithoutDivide(value) {
    const bigNumberValue = new bignumber_js_1.BigNumber(value.toString());
    return bigNumberValue.toNumber();
}
function fromBigIntMultiply(value1, value2, scale = 18) {
    const scaleFactor = new bignumber_js_1.BigNumber(10).pow(scale);
    const bigNumberValue1 = new bignumber_js_1.BigNumber(value1.toString()).div(scaleFactor);
    const bigNumberValue2 = new bignumber_js_1.BigNumber(value2.toString()).div(scaleFactor);
    const result = bigNumberValue1.multipliedBy(bigNumberValue2);
    return result.toNumber();
}
function fromWei(value) {
    return value / Math.pow(10, 18);
}
function toWei(value) {
    return value * Math.pow(10, 18);
}
function convertBigInt(obj) {
    if (Array.isArray(obj)) {
        return obj.map((item) => convertBigInt(item));
    }
    else if (obj !== null && typeof obj === "object") {
        const newObj = {};
        for (const key in obj) {
            if (obj[key] instanceof Date) {
                newObj[key] = obj[key].toISOString();
            }
            else if (typeof obj[key] === "bigint") {
                newObj[key] = fromBigInt(obj[key]);
            }
            else if (obj[key] === null) {
                newObj[key] = null;
            }
            else {
                newObj[key] = convertBigInt(obj[key]);
            }
        }
        return newObj;
    }
    else if (typeof obj === "bigint") {
        return fromBigInt(obj);
    }
    else {
        return obj;
    }
}
async function cacheTokenDecimals() {
    try {
        const tokenDecimals = await getTokenDecimal();
        const redis = redis_1.RedisSingleton.getInstance();
        await redis.setex("token_decimals", 86000, JSON.stringify(tokenDecimals));
        console_1.logger.info("ECOSYSTEM", "Cached token decimals");
    }
    catch (error) {
        console_1.logger.error("ECOSYSTEM", "Failed to cache token decimals in Redis", error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to cache token decimals: ${error.message}` });
    }
}
async function getCachedTokenDecimals() {
    const redis = redis_1.RedisSingleton.getInstance();
    let cachedData;
    try {
        cachedData = await redis.get("token_decimals");
    }
    catch (error) {
        console_1.logger.error("ECOSYSTEM", "Failed to get cached token decimals from Redis", error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to get cached token decimals: ${error.message}` });
    }
    if (cachedData) {
        return JSON.parse(cachedData);
    }
    try {
        await cacheTokenDecimals();
    }
    catch (error) {
        console_1.logger.error("ECOSYSTEM", "Failed to populate token decimals cache", error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to cache token decimals: ${error.message}` });
    }
    try {
        cachedData = await redis.get("token_decimals");
    }
    catch (error) {
        console_1.logger.error("ECOSYSTEM", "Failed to get cached token decimals after population", error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to get cached token decimals: ${error.message}` });
    }
    if (cachedData) {
        return JSON.parse(cachedData);
    }
    return {};
}
const BigIntReplacer = (key, value) => {
    if (typeof value === "bigint") {
        return value.toString();
    }
    return value;
};
exports.BigIntReplacer = BigIntReplacer;
function standardUnitToSatoshi(amount, chain) {
    const conversionFactor = getConversionFactor(chain);
    return Math.round(amount * conversionFactor);
}
function satoshiToStandardUnit(satoshi, chain) {
    const conversionFactor = getConversionFactor(chain);
    return satoshi / conversionFactor;
}
function getConversionFactor(chain) {
    return {
        BTC: 100000000,
        LTC: 100000000,
        DOGE: 100000000,
    }[chain];
}
exports.litecoinNetwork = {
    messagePrefix: "\x19Litecoin Signed Message:\n",
    bech32: "ltc",
    bip32: {
        public: 0x019da462,
        private: 0x019d9cfe,
    },
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0,
};
exports.dogecoinNetwork = {
    messagePrefix: "\x19Dogecoin Signed Message:\n",
    bech32: "doge",
    bip32: {
        public: 0x02facafd,
        private: 0x02fac398,
    },
    pubKeyHash: 0x1e,
    scriptHash: 0x16,
    wif: 0x9e,
};
exports.dashNetwork = {
    messagePrefix: "\x19Dash Signed Message:\n",
    bech32: "dash",
    bip32: {
        public: 0x02fe52f8,
        private: 0x02fe52cc,
    },
    pubKeyHash: 0x4c,
    scriptHash: 0x10,
    wif: 0xcc,
};
exports.bitcoinCashNetwork = {
    messagePrefix: "\x19Bitcoin Signed Message:\n",
    bech32: "bc",
    bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4,
    },
    pubKeyHash: 0x00,
    scriptHash: 0x05,
    wif: 0x80,
};
