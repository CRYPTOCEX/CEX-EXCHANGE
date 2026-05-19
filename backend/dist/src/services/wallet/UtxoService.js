"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utxoService = exports.UtxoService = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const errors_1 = require("./errors");
const precision_1 = require("./utils/precision");
const constants_1 = require("./constants");
class UtxoService {
    constructor() { }
    static getInstance() {
        if (!UtxoService.instance) {
            UtxoService.instance = new UtxoService();
        }
        return UtxoService.instance;
    }
    async saveUtxos(walletId, txHash, outputs, walletAddress, transaction) {
        if (!db_1.models.ecosystemUtxo) {
            console_1.logger.warn("UTXO", "EcosystemUtxo model not available");
            return [];
        }
        const savedUtxos = [];
        for (let index = 0; index < outputs.length; index++) {
            const output = outputs[index];
            if (output.addresses && output.addresses.includes(walletAddress)) {
                try {
                    const existing = await db_1.models.ecosystemUtxo.findOne({
                        where: { transactionId: txHash, index },
                        ...(transaction && { transaction }),
                    });
                    if (existing) {
                        console_1.logger.debug("UTXO", `UTXO ${txHash}:${index} already exists, skipping`);
                        continue;
                    }
                    const utxo = await db_1.models.ecosystemUtxo.create({
                        walletId,
                        transactionId: txHash,
                        index,
                        amount: parseFloat(output.value.toString()),
                        script: output.script || "",
                        status: false,
                    }, transaction ? { transaction } : undefined);
                    savedUtxos.push(this.toAttributes(utxo));
                    console_1.logger.debug("UTXO", `Saved UTXO: ${txHash}:${index} amount=${output.value}`);
                }
                catch (error) {
                    console_1.logger.error("UTXO", `Failed to save UTXO ${txHash}:${index}: ${error.message}`);
                }
            }
        }
        return savedUtxos;
    }
    async createUtxo(walletId, transactionId, index, amount, script, transaction) {
        if (!db_1.models.ecosystemUtxo) {
            throw new errors_1.UtxoError("EcosystemUtxo model not available");
        }
        const utxo = await db_1.models.ecosystemUtxo.create({
            walletId,
            transactionId,
            index,
            amount,
            script,
            status: false,
        }, transaction ? { transaction } : undefined);
        return this.toAttributes(utxo);
    }
    async selectUtxos(walletId, targetAmount, chain, feePerByte = 10) {
        if (!db_1.models.ecosystemUtxo) {
            throw new errors_1.UtxoError("EcosystemUtxo model not available");
        }
        const utxos = await db_1.models.ecosystemUtxo.findAll({
            where: { walletId, status: false },
            order: [["amount", "DESC"]],
        });
        if (utxos.length === 0) {
            throw new errors_1.InsufficientFundsError(0, targetAmount, chain);
        }
        const dustLimit = (0, constants_1.getDustLimit)(chain);
        const selectedUtxos = [];
        let totalSelected = 0;
        let estimatedFee = 0;
        for (const utxo of utxos) {
            const utxoAmount = parseFloat(utxo.amount.toString());
            if (utxoAmount < dustLimit)
                continue;
            selectedUtxos.push(this.toAttributes(utxo));
            totalSelected = (0, precision_1.safeAdd)(totalSelected, utxoAmount, chain);
            const estimatedSize = constants_1.UTXO_TX_SIZE.BASE_TX +
                selectedUtxos.length * constants_1.UTXO_TX_SIZE.INPUT_SIZE +
                2 * constants_1.UTXO_TX_SIZE.OUTPUT_SIZE;
            estimatedFee = (estimatedSize * feePerByte) / 100000000;
            if (totalSelected >= targetAmount + estimatedFee) {
                break;
            }
        }
        if (totalSelected < targetAmount + estimatedFee) {
            throw new errors_1.InsufficientFundsError(totalSelected, targetAmount + estimatedFee, chain);
        }
        const change = (0, precision_1.safeSubtract)(totalSelected, targetAmount + estimatedFee, chain);
        return {
            utxos: selectedUtxos,
            totalAmount: totalSelected,
            fee: (0, precision_1.roundToPrecision)(estimatedFee, chain),
            change: change > dustLimit ? change : 0,
        };
    }
    async selectAllUtxos(walletId) {
        if (!db_1.models.ecosystemUtxo) {
            return [];
        }
        const utxos = await db_1.models.ecosystemUtxo.findAll({
            where: { walletId, status: false },
            order: [["amount", "DESC"]],
        });
        return utxos.map((u) => this.toAttributes(u));
    }
    async markAsSpent(utxoIds, transaction) {
        if (!db_1.models.ecosystemUtxo || utxoIds.length === 0) {
            return;
        }
        await db_1.models.ecosystemUtxo.update({ status: true }, {
            where: { id: { [sequelize_1.Op.in]: utxoIds } },
            ...(transaction && { transaction }),
        });
        console_1.logger.debug("UTXO", `Marked ${utxoIds.length} UTXOs as spent`);
    }
    async markAsUnspent(utxoIds, transaction) {
        if (!db_1.models.ecosystemUtxo || utxoIds.length === 0) {
            return;
        }
        await db_1.models.ecosystemUtxo.update({ status: false }, {
            where: { id: { [sequelize_1.Op.in]: utxoIds } },
            ...(transaction && { transaction }),
        });
        console_1.logger.debug("UTXO", `Marked ${utxoIds.length} UTXOs as unspent`);
    }
    async markByTxHashAsSpent(transactionId, transaction) {
        if (!db_1.models.ecosystemUtxo) {
            return;
        }
        await db_1.models.ecosystemUtxo.update({ status: true }, {
            where: { transactionId },
            ...(transaction && { transaction }),
        });
    }
    async needsConsolidation(walletId, chain) {
        if (!db_1.models.ecosystemUtxo) {
            return false;
        }
        const utxos = await db_1.models.ecosystemUtxo.findAll({
            where: { walletId, status: false },
        });
        if (utxos.length < 5)
            return false;
        const totalAmount = utxos.reduce((sum, u) => sum + parseFloat(u.amount.toString()), 0);
        const avgAmount = totalAmount / utxos.length;
        const costToSpend = (constants_1.UTXO_TX_SIZE.INPUT_SIZE * 10) / 100000000;
        return avgAmount < costToSpend * 3;
    }
    async getUtxosForConsolidation(walletId, maxUtxos = 100) {
        if (!db_1.models.ecosystemUtxo) {
            return [];
        }
        const utxos = await db_1.models.ecosystemUtxo.findAll({
            where: { walletId, status: false },
            order: [["amount", "ASC"]],
            limit: maxUtxos,
        });
        return utxos.map((u) => this.toAttributes(u));
    }
    async getConsolidationRecommendation(walletId, chain) {
        if (!db_1.models.ecosystemUtxo) {
            return {
                shouldConsolidate: false,
                utxoCount: 0,
                totalAmount: 0,
                estimatedFee: 0,
                estimatedSavings: 0,
            };
        }
        const utxos = await db_1.models.ecosystemUtxo.findAll({
            where: { walletId, status: false },
        });
        const utxoCount = utxos.length;
        const totalAmount = utxos.reduce((sum, u) => sum + parseFloat(u.amount.toString()), 0);
        const consolidationSize = constants_1.UTXO_TX_SIZE.BASE_TX +
            utxoCount * constants_1.UTXO_TX_SIZE.INPUT_SIZE +
            constants_1.UTXO_TX_SIZE.OUTPUT_SIZE;
        const estimatedFee = (consolidationSize * 10) / 100000000;
        const futureSavings = ((utxoCount - 1) * constants_1.UTXO_TX_SIZE.INPUT_SIZE * 10) / 100000000;
        return {
            shouldConsolidate: utxoCount >= 10 && futureSavings > estimatedFee,
            utxoCount,
            totalAmount,
            estimatedFee,
            estimatedSavings: futureSavings - estimatedFee,
        };
    }
    async getUnspentBalance(walletId) {
        if (!db_1.models.ecosystemUtxo) {
            return 0;
        }
        const result = await db_1.models.ecosystemUtxo.sum("amount", {
            where: { walletId, status: false },
        });
        return result || 0;
    }
    async getUtxoCount(walletId) {
        if (!db_1.models.ecosystemUtxo) {
            return { unspent: 0, spent: 0 };
        }
        const unspent = await db_1.models.ecosystemUtxo.count({
            where: { walletId, status: false },
        });
        const spent = await db_1.models.ecosystemUtxo.count({
            where: { walletId, status: true },
        });
        return { unspent, spent };
    }
    async getById(id) {
        if (!db_1.models.ecosystemUtxo) {
            return null;
        }
        const utxo = await db_1.models.ecosystemUtxo.findByPk(id);
        return utxo ? this.toAttributes(utxo) : null;
    }
    async getByTxIdAndIndex(transactionId, index) {
        if (!db_1.models.ecosystemUtxo) {
            return null;
        }
        const utxo = await db_1.models.ecosystemUtxo.findOne({
            where: { transactionId, index },
        });
        return utxo ? this.toAttributes(utxo) : null;
    }
    async getAllForWallet(walletId) {
        if (!db_1.models.ecosystemUtxo) {
            return [];
        }
        const utxos = await db_1.models.ecosystemUtxo.findAll({
            where: { walletId },
            order: [["createdAt", "DESC"]],
        });
        return utxos.map((u) => this.toAttributes(u));
    }
    async cleanupOldSpentUtxos(daysOld = 30) {
        if (!db_1.models.ecosystemUtxo) {
            return 0;
        }
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        const result = await db_1.models.ecosystemUtxo.destroy({
            where: {
                status: true,
                updatedAt: { [sequelize_1.Op.lt]: cutoffDate },
            },
        });
        if (result > 0) {
            console_1.logger.info("UTXO", `Cleaned up ${result} old spent UTXOs`);
        }
        return result;
    }
    toAttributes(utxo) {
        var _a;
        const plain = utxo.get ? utxo.get({ plain: true }) : utxo;
        return {
            ...plain,
            amount: parseFloat(((_a = plain.amount) === null || _a === void 0 ? void 0 : _a.toString()) || "0"),
        };
    }
}
exports.UtxoService = UtxoService;
exports.utxoService = UtxoService.getInstance();
