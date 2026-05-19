"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = void 0;
exports.updateExtensionQuery = updateExtensionQuery;
exports.updateBlockchainQuery = updateBlockchainQuery;
exports.updateExchangeQuery = updateExchangeQuery;
const db_1 = require("@b/db");
async function updateExtensionQuery(id, version) {
    return await db_1.models.extension.update({
        version: version,
    }, {
        where: {
            productId: id,
        },
    });
}
async function updateBlockchainQuery(id, version) {
    return await db_1.models.ecosystemBlockchain.update({
        version: version,
    }, {
        where: {
            productId: id,
        },
    });
}
async function updateExchangeQuery(id, version) {
    return await db_1.models.exchange.update({
        version: version,
    }, {
        where: {
            productId: id,
        },
    });
}
const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
exports.sleep = sleep;
