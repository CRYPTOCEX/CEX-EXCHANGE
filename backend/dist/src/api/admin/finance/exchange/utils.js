"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.standardizeOkxData = exports.standardizeXtData = exports.standardizeKucoinData = exports.standardizeBinanceData = void 0;
exports.countDecimals = countDecimals;
exports.saveLicense = saveLicense;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const standardizeBinanceData = (data) => {
    if (data && typeof data === "object" && !Array.isArray(data)) {
        return Object.values(data).map((item) => {
            const info = item.info;
            return {
                network: item.network,
                withdrawStatus: item.withdraw,
                depositStatus: item.deposit,
                minWithdraw: parseFloat(info.withdrawMin),
                maxWithdraw: parseFloat(info.withdrawMax),
                withdrawFee: parseFloat(info.withdrawFee),
                withdrawMemo: info.memoRegex && info.memoRegex.trim() !== "" ? true : false,
            };
        });
    }
    return [];
};
exports.standardizeBinanceData = standardizeBinanceData;
const standardizeKucoinData = (data) => {
    const standardizedData = Object.values(data.networks || []);
    return standardizedData.map((network) => {
        var _a, _b, _c, _d, _e;
        return ({
            network: network.name,
            withdrawStatus: network.withdraw,
            depositStatus: network.deposit,
            minWithdraw: parseFloat((_c = (_b = (_a = network.limits) === null || _a === void 0 ? void 0 : _a.withdrawal) === null || _b === void 0 ? void 0 : _b.min) !== null && _c !== void 0 ? _c : 0),
            maxWithdraw: null,
            withdrawFee: parseFloat((_d = network.fee) !== null && _d !== void 0 ? _d : 0),
            withdrawMemo: network.contractAddress && network.contractAddress.trim() !== ""
                ? true
                : false,
            chainId: network.id ? network.id.toUpperCase() : null,
            precision: countDecimals((_e = network.precision) !== null && _e !== void 0 ? _e : 0) || 8,
        });
    });
};
exports.standardizeKucoinData = standardizeKucoinData;
const standardizeXtData = (data) => {
    var _a, _b, _c, _d, _e, _f;
    const standardizedData = [];
    if (data && typeof data === "object") {
        for (const networkKey in data.networks || {}) {
            const network = data.networks[networkKey];
            const fee = parseFloat(data.fee);
            const validFee = !isNaN(fee) ? fee : null;
            standardizedData.push({
                network: networkKey,
                withdrawStatus: data.info.withdrawStatus === "1",
                depositStatus: data.info.depositStatus === "1",
                minWithdraw: parseFloat((_c = (_b = (_a = network.limits) === null || _a === void 0 ? void 0 : _a.withdraw) === null || _b === void 0 ? void 0 : _b.min) !== null && _c !== void 0 ? _c : "0"),
                maxWithdraw: ((_e = (_d = network.limits) === null || _d === void 0 ? void 0 : _d.withdraw) === null || _e === void 0 ? void 0 : _e.max)
                    ? parseFloat(network.limits.withdraw.max)
                    : null,
                withdrawFee: validFee !== null && validFee !== void 0 ? validFee : 0,
                withdrawMemo: false,
                chainId: networkKey.toUpperCase(),
                precision: countDecimals((_f = data.precision) !== null && _f !== void 0 ? _f : 1e-8),
            });
        }
    }
    return standardizedData;
};
exports.standardizeXtData = standardizeXtData;
function countDecimals(num) {
    if (Math.floor(num) === num)
        return 0;
    const str = num.toString();
    const scientificNotationMatch = /^(\d+\.?\d*|\.\d+)e([+-]\d+)$/.exec(str);
    if (scientificNotationMatch) {
        const decimalStr = scientificNotationMatch[1].split(".")[1] || "";
        let decimalCount = decimalStr.length + parseInt(scientificNotationMatch[2]);
        decimalCount = Math.abs(decimalCount);
        return Math.min(decimalCount, 8);
    }
    else {
        const decimalStr = str.split(".")[1] || "";
        return Math.min(decimalStr.length, 8);
    }
}
const standardizeOkxData = (data) => {
    if (data && typeof data === "object" && !Array.isArray(data)) {
        return Object.values(data).map((item) => {
            return {
                network: item.network,
                withdrawStatus: item.withdraw,
                depositStatus: item.deposit,
                minWithdraw: parseFloat(item.minWithdrawal),
                maxWithdraw: parseFloat(item.maxWithdrawal),
                withdrawFee: parseFloat(item.withdrawalFee),
                withdrawMemo: item.memoRegex && item.memoRegex.trim() !== "" ? true : false,
            };
        });
    }
    return [];
};
exports.standardizeOkxData = standardizeOkxData;
async function saveLicense(productId, username) {
    await db_1.sequelize
        .transaction(async (transaction) => {
        await db_1.models.exchange.update({
            status: false,
        }, {
            where: {
                status: true,
                productId: { [sequelize_1.Op.not]: productId },
            },
            transaction,
        });
        await db_1.models.exchange.update({
            licenseStatus: true,
            status: true,
            username: username,
        }, {
            where: { productId: productId },
            transaction,
        });
    })
        .catch((error) => {
        console_1.logger.error("EXCHANGE", "Error in saveLicense", error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to save license: ${error.message}` });
    });
}
