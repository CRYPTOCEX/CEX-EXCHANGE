"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceTracker = void 0;
const db_1 = require("@b/db");
const tvl_1 = require("../../helpers/tvl");
const error_1 = require("@b/utils/error");
class BalanceTracker {
    constructor(marketMakerId) {
        this.baseCurrencyBalance = 0;
        this.quoteCurrencyBalance = 0;
        this.reservedBase = 0;
        this.reservedQuote = 0;
        this.initialBaseBalance = 0;
        this.initialQuoteBalance = 0;
        this.lastSyncTime = null;
        this.currentPrice = 0;
        this.marketMakerId = marketMakerId;
    }
    setCurrentPrice(price) {
        this.currentPrice = price;
    }
    async syncFromDatabase() {
        try {
            const pool = await db_1.models.aiMarketMakerPool.findOne({
                where: { marketMakerId: this.marketMakerId },
            });
            if (pool) {
                this.baseCurrencyBalance = Number(pool.baseCurrencyBalance) || 0;
                this.quoteCurrencyBalance = Number(pool.quoteCurrencyBalance) || 0;
                this.initialBaseBalance = Number(pool.initialBaseBalance) || 0;
                this.initialQuoteBalance = Number(pool.initialQuoteBalance) || 0;
                this.lastSyncTime = new Date();
            }
        }
        catch (error) {
        }
    }
    async getBalance() {
        if (!this.lastSyncTime || Date.now() - this.lastSyncTime.getTime() > 60000) {
            await this.syncFromDatabase();
        }
        const totalValueLocked = (0, tvl_1.calculateTVL)({
            baseBalance: this.baseCurrencyBalance,
            quoteBalance: this.quoteCurrencyBalance,
            currentPrice: this.currentPrice,
        });
        return {
            baseCurrency: this.baseCurrencyBalance,
            quoteCurrency: this.quoteCurrencyBalance,
            totalValueLocked,
        };
    }
    getAvailableBalance() {
        return {
            base: Math.max(0, this.baseCurrencyBalance - this.reservedBase),
            quote: Math.max(0, this.quoteCurrencyBalance - this.reservedQuote),
        };
    }
    reserve(currency, amount) {
        const available = this.getAvailableBalance();
        if (currency === "base") {
            if (available.base < amount) {
                return false;
            }
            this.reservedBase += amount;
        }
        else {
            if (available.quote < amount) {
                return false;
            }
            this.reservedQuote += amount;
        }
        return true;
    }
    release(currency, amount) {
        if (currency === "base") {
            this.reservedBase = Math.max(0, this.reservedBase - amount);
        }
        else {
            this.reservedQuote = Math.max(0, this.reservedQuote - amount);
        }
    }
    async deposit(currency, amount) {
        if (currency === "base") {
            this.baseCurrencyBalance += amount;
        }
        else {
            this.quoteCurrencyBalance += amount;
        }
    }
    async withdraw(currency, amount) {
        const available = this.getAvailableBalance();
        if (currency === "base") {
            if (available.base < amount) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient base currency balance" });
            }
            this.baseCurrencyBalance -= amount;
        }
        else {
            if (available.quote < amount) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient quote currency balance" });
            }
            this.quoteCurrencyBalance -= amount;
        }
    }
    async canWithdraw(currency, amount) {
        const available = this.getAvailableBalance();
        if (currency === "base") {
            return available.base >= amount;
        }
        else {
            return available.quote >= amount;
        }
    }
    async rebalance(targetRatio = 0.5) {
        const total = this.baseCurrencyBalance + this.quoteCurrencyBalance;
        this.baseCurrencyBalance = total * targetRatio;
        this.quoteCurrencyBalance = total * (1 - targetRatio);
    }
    applyTrade(side, amount, price, fee = 0) {
        const cost = amount * price;
        if (side === "BUY") {
            this.baseCurrencyBalance += amount;
            this.quoteCurrencyBalance -= cost + fee;
        }
        else {
            this.baseCurrencyBalance -= amount;
            this.quoteCurrencyBalance += cost - fee;
        }
    }
    getInitialBalances() {
        return {
            base: this.initialBaseBalance,
            quote: this.initialQuoteBalance,
        };
    }
    getReserved() {
        return {
            base: this.reservedBase,
            quote: this.reservedQuote,
        };
    }
}
exports.BalanceTracker = BalanceTracker;
exports.default = BalanceTracker;
