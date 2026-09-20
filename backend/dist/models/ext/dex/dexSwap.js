"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const units_1 = require("@b/utils/dex/units");
function vmAddressValidator(field, optional) {
    return function (value) {
        var _a;
        if (optional && (value === null || value === undefined || value === ""))
            return;
        if (!(0, units_1.isAddressValidForVm)(this === null || this === void 0 ? void 0 : this.vm, String(value !== null && value !== void 0 ? value : ""))) {
            throw new Error(`dexSwap.${field} is not a valid ${(_a = this === null || this === void 0 ? void 0 : this.vm) !== null && _a !== void 0 ? _a : "EVM"} address`);
        }
    };
}
function vmTxIdValidator(field, optional) {
    return function (value) {
        var _a;
        if (optional && (value === null || value === undefined || value === ""))
            return;
        if (!(0, units_1.isTxIdValidForVm)(this === null || this === void 0 ? void 0 : this.vm, String(value !== null && value !== void 0 ? value : ""))) {
            throw new Error(`dexSwap.${field} is not a valid ${(_a = this === null || this === void 0 ? void 0 : this.vm) !== null && _a !== void 0 ? _a : "EVM"} transaction id`);
        }
    };
}
class dexSwap extends sequelize_1.Model {
    static initModel(sequelize) {
        return dexSwap.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            quoteId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "NULL for an APPROVAL, which is not quoted",
            },
            pairId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            kind: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
                defaultValue: "SWAP",
                validate: { isIn: [["SWAP", "APPROVAL", "WRAP", "UNWRAP"]] },
            },
            chainId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
            },
            vm: {
                type: sequelize_1.DataTypes.STRING(8),
                allowNull: false,
                defaultValue: "EVM",
                validate: { isIn: [[...units_1.DEX_VM_VALUES]] },
                comment: "Decides what a transaction id and an address ARE on this row, and whether lowercasing either destroys it",
            },
            txHash: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_TX_ID_COLUMN_WIDTH),
                allowNull: false,
                validate: { txIdMatchesVm: vmTxIdValidator("txHash", false) },
                set(value) {
                    this.setDataValue("txHash", (0, units_1.normalizeChainTxIdValue)(value));
                },
                comment: "EVM: 0x + 64 hex. SVM: an 87-88 char base58 SIGNATURE. TVM: 64 bare hex. TON: the external MESSAGE hash, which is what toncenter's msg_hash index is keyed by — TON has no single transaction hash",
            },
            nonce: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                comment: "Sender nonce, persisted on first sighting. Required by the DROPPED rule: a pending tx whose nonce has already been consumed by a different hash was replaced, not lost. EVM ONLY — null on every other VM, which is why the drop rule falls back to elapsed time there",
            },
            fromAddress: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_ADDRESS_COLUMN_WIDTH),
                allowNull: false,
                validate: { addressMatchesVm: vmAddressValidator("fromAddress", false) },
                set(value) {
                    this.setDataValue("fromAddress", (0, units_1.normalizeChainAddressValue)(value));
                },
                comment: "The sender AS READ FROM THE CHAIN, never as claimed by the client — this is what ties an on-chain fact to a user",
            },
            toAddress: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_ADDRESS_COLUMN_WIDTH),
                allowNull: true,
                validate: { addressMatchesVm: vmAddressValidator("toAddress", true) },
                set(value) {
                    this.setDataValue("toAddress", (0, units_1.normalizeChainAddressValue)(value));
                },
            },
            sellTokenId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            buyTokenId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            sellAmountRaw: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
                validate: { is: units_1.RAW_AMOUNT_RE },
                comment: "As quoted",
            },
            buyAmountRaw: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
                validate: { is: units_1.RAW_AMOUNT_RE },
                comment: "As quoted",
            },
            realizedBuyAmountRaw: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
                validate: { is: units_1.RAW_AMOUNT_RE },
                comment: "Decoded from the receipt Transfer logs — what actually arrived",
            },
            sellAmountDisplay: {
                type: sequelize_1.DataTypes.DECIMAL(38, 18),
                allowNull: true,
                get() {
                    const v = this.getDataValue("sellAmountDisplay");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "display/aggregation only — LOSSY, never authoritative",
            },
            buyAmountDisplay: {
                type: sequelize_1.DataTypes.DECIMAL(38, 18),
                allowNull: true,
                get() {
                    const v = this.getDataValue("buyAmountDisplay");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "display/aggregation only — LOSSY, never authoritative",
            },
            realizedBuyAmountDisplay: {
                type: sequelize_1.DataTypes.DECIMAL(38, 18),
                allowNull: true,
                get() {
                    const v = this.getDataValue("realizedBuyAmountDisplay");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "display/aggregation only — LOSSY, never authoritative",
            },
            sellUsd: {
                type: sequelize_1.DataTypes.DECIMAL(20, 8),
                allowNull: true,
                get() {
                    const v = this.getDataValue("sellUsd");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "USD snapshot at confirmation — display/aggregation only, LOSSY",
            },
            buyUsd: {
                type: sequelize_1.DataTypes.DECIMAL(20, 8),
                allowNull: true,
                get() {
                    const v = this.getDataValue("buyUsd");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "USD snapshot at confirmation — display/aggregation only, LOSSY",
            },
            executionPrice: {
                type: sequelize_1.DataTypes.DECIMAL(38, 18),
                allowNull: true,
                get() {
                    const v = this.getDataValue("executionPrice");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "display/aggregation only — LOSSY, never authoritative",
            },
            slippageRealizedBps: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                comment: "Signed: negative means the fill beat the quote",
            },
            status: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: [
                        [
                            "PENDING",
                            "MINED",
                            "CONFIRMED",
                            "REVERTED",
                            "DROPPED",
                            "REPLACED",
                            "REORGED",
                        ],
                    ],
                },
                comment: "PENDING (broadcast, unmined) -> MINED (in a block) -> CONFIRMED (past requiredConfirmations); REVERTED, DROPPED (nonce consumed elsewhere), REPLACED (the user's wallet sped it up or cancelled it) and REORGED are terminal and each needs a different user-facing message",
            },
            statusReason: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "Short machine slug, translated for display — never a raw provider string",
            },
            statusHistory: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                set(value) {
                    this.setDataValue("statusHistory", typeof value === "string" ? value : JSON.stringify(value));
                },
                get() {
                    const v = this.getDataValue("statusHistory");
                    if (typeof v !== "string")
                        return v !== null && v !== void 0 ? v : null;
                    try {
                        return v.trim() ? JSON.parse(v) : null;
                    }
                    catch (_a) {
                        return null;
                    }
                },
                comment: 'Append-only JSON array of "status", "at", "reason" entries. A "my swap says dropped" ticket is unanswerable without it, because status alone has already been overwritten',
            },
            statusChangedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            replacedByTxHash: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_TX_ID_COLUMN_WIDTH),
                allowNull: true,
                validate: { txIdMatchesVm: vmTxIdValidator("replacedByTxHash", true) },
                set(value) {
                    this.setDataValue("replacedByTxHash", (0, units_1.normalizeChainTxIdValue)(value));
                },
                comment: "Set with status=REPLACED: the id of the speed-up/cancel the user's wallet broadcast in this one's place. Client-reported (viem's onReplaced) and verified server-side by (fromAddress, nonce) — no RPC can be asked which transaction consumed a nonce. EVM ONLY in practice: replacement is a nonce mechanic, and no other VM here has one",
            },
            blockNumber: {
                type: sequelize_1.DataTypes.BIGINT,
                allowNull: true,
            },
            blockHash: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_TX_ID_COLUMN_WIDTH),
                allowNull: true,
                set(value) {
                    this.setDataValue("blockHash", (0, units_1.normalizeChainTxIdValue)(value));
                },
                comment: "Reorg detection: a confirmed swap whose block hash no longer matches the chain at that height was reorged out. Empty string on TRON means NOT COMPARED — the API does not return one",
            },
            blockTimestamp: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            confirmations: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            gasUsed: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
                validate: { is: units_1.RAW_AMOUNT_RE },
            },
            effectiveGasPrice: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
                validate: { is: units_1.RAW_AMOUNT_RE },
                comment: "Wei per gas unit",
            },
            gasCostNativeRaw: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
                validate: { is: units_1.RAW_AMOUNT_RE },
                comment: "gasUsed * effectiveGasPrice, in wei",
            },
            gasCostUsd: {
                type: sequelize_1.DataTypes.DECIMAL(20, 8),
                allowNull: true,
                get() {
                    const v = this.getDataValue("gasCostUsd");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "display/aggregation only — LOSSY, never authoritative",
            },
            aggregator: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
                comment: 'dexProvider.name, copied from the quote so the row survives a provider delete. A direct route writes "direct" — every NEW consumer reads venueKind',
            },
            venueKind: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
                defaultValue: "AGGREGATOR",
                validate: { isIn: [["AGGREGATOR", "DIRECT_POOL"]] },
                comment: "NOT NULL with a default, so every existing row stays valid with no compensating script",
            },
            venueName: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
                comment: "The AMM deployment key on a direct route",
            },
            poolId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Which pool filled this. SET NULL rather than RESTRICT: the swap record must outlive a pool archive",
            },
            feeBps: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                comment: "Copied from the quote — the settings value may have moved since",
            },
            feeRecipient: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_ADDRESS_COLUMN_WIDTH),
                allowNull: true,
                validate: { addressMatchesVm: vmAddressValidator("feeRecipient", true) },
                set(value) {
                    this.setDataValue("feeRecipient", (0, units_1.normalizeChainAddressValue)(value));
                },
            },
            feeSide: {
                type: sequelize_1.DataTypes.STRING(8),
                allowNull: true,
                validate: { isIn: [["SELL", "BUY"]] },
            },
            lastCheckedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "Poller cursor",
            },
            checkAttempts: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: "Drives the poller backoff, so one dead RPC does not pin the sweep",
            },
            reorgCheckedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            confirmedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            metadata: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                set(value) {
                    this.setDataValue("metadata", typeof value === "string" ? value : JSON.stringify(value));
                },
                get() {
                    const v = this.getDataValue("metadata");
                    return typeof v === "string" ? JSON.parse(v) : (v !== null && v !== void 0 ? v : null);
                },
            },
        }, {
            sequelize,
            modelName: "dexSwap",
            tableName: "dex_swap",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "dexSwapChainTxKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "chainId" }, { name: "txHash" }],
                },
                {
                    name: "dexSwapUserCreatedIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "createdAt" }],
                },
                {
                    name: "dexSwapPollerIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }, { name: "lastCheckedAt" }],
                },
                {
                    name: "dexSwapReorgIdx",
                    using: "BTREE",
                    fields: [
                        { name: "status" },
                        { name: "reorgCheckedAt" },
                        { name: "confirmedAt" },
                    ],
                },
                {
                    name: "dexSwapChainStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "chainId" }, { name: "status" }],
                },
                {
                    name: "dexSwapVenueIdx",
                    using: "BTREE",
                    fields: [{ name: "venueKind" }, { name: "status" }],
                },
                {
                    name: "dexSwapQuoteIdx",
                    using: "BTREE",
                    fields: [{ name: "quoteId" }],
                },
                {
                    name: "dexSwapPairTapeIdx",
                    using: "BTREE",
                    fields: [{ name: "pairId" }, { name: "status" }, { name: "confirmedAt" }],
                },
            ],
        });
    }
    static associate(models) {
        dexSwap.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        dexSwap.belongsTo(models.dexQuote, {
            as: "quote",
            foreignKey: "quoteId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        dexSwap.belongsTo(models.dexPair, {
            as: "pair",
            foreignKey: "pairId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        dexSwap.belongsTo(models.dexToken, {
            as: "sellToken",
            foreignKey: "sellTokenId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        dexSwap.belongsTo(models.dexToken, {
            as: "buyToken",
            foreignKey: "buyTokenId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        dexSwap.hasMany(models.dexFeeAccrual, {
            as: "feeAccruals",
            foreignKey: "swapId",
        });
    }
}
exports.default = dexSwap;
