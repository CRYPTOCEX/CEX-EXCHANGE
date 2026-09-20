"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const units_1 = require("@b/utils/dex/units");
class dexFeeAccrual extends sequelize_1.Model {
    static initModel(sequelize) {
        return dexFeeAccrual.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            swapId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Nullable so revenue survives an account deletion",
            },
            chainId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
            },
            tokenId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            vm: {
                type: sequelize_1.DataTypes.STRING(8),
                allowNull: false,
                defaultValue: "EVM",
                validate: { isIn: [[...units_1.DEX_VM_VALUES]] },
            },
            tokenAddress: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_ADDRESS_COLUMN_WIDTH),
                allowNull: false,
                validate: {
                    addressMatchesVm(value) {
                        var _a;
                        if (!(0, units_1.isAddressValidForVm)(this.vm, String(value !== null && value !== void 0 ? value : ""))) {
                            throw new Error(`dexFeeAccrual.tokenAddress is not a valid ${(_a = this.vm) !== null && _a !== void 0 ? _a : "EVM"} address`);
                        }
                    },
                },
                set(value) {
                    this.setDataValue("tokenAddress", (0, units_1.normalizeChainAddressValue)(value));
                },
                comment: "Denormalised — the revenue report must survive a delist",
            },
            tokenSymbol: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
                comment: "Denormalised — the revenue report must survive a delist",
            },
            tokenDecimals: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: { min: 0, max: 36 },
                comment: "Denormalised. Without it a swept accrual cannot be re-derived from amountRaw once the token row is gone",
            },
            feeRecipient: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_ADDRESS_COLUMN_WIDTH),
                allowNull: false,
                validate: {
                    addressMatchesVm(value) {
                        var _a;
                        if (!(0, units_1.isAddressValidForVm)(this.vm, String(value !== null && value !== void 0 ? value : ""))) {
                            throw new Error(`dexFeeAccrual.feeRecipient is not a valid ${(_a = this.vm) !== null && _a !== void 0 ? _a : "EVM"} address`);
                        }
                    },
                },
                set(value) {
                    this.setDataValue("feeRecipient", (0, units_1.normalizeChainAddressValue)(value));
                },
                comment: "Where the value actually landed — the platform holds the key, not a wallet row. On SVM this is a TOKEN ACCOUNT for the fee mint, not a wallet: SPL fees can only arrive in an account that already exists for that mint",
            },
            amountRaw: {
                type: sequelize_1.DataTypes.STRING(79),
                allowNull: false,
                validate: { is: units_1.SIGNED_RAW_AMOUNT_RE },
                comment: "The ONLY signed raw column in this addon: a reorg reversal is a negative row rather than a deletion",
            },
            amountDisplay: {
                type: sequelize_1.DataTypes.DECIMAL(38, 18),
                allowNull: false,
                get() {
                    const v = this.getDataValue("amountDisplay");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "display/aggregation only — LOSSY, never authoritative. Signed, like amountRaw",
            },
            amountUsd: {
                type: sequelize_1.DataTypes.DECIMAL(20, 8),
                allowNull: true,
                get() {
                    const v = this.getDataValue("amountUsd");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "USD snapshot at confirmation — display/aggregation only, LOSSY",
            },
            feeBps: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
            },
            feeSide: {
                type: sequelize_1.DataTypes.STRING(8),
                allowNull: false,
                validate: { isIn: [["SELL", "BUY"]] },
            },
            verification: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
                validate: { isIn: [["RECEIPT", "ESTIMATED", "REVERSAL"]] },
                comment: "RECEIPT = proved by a Transfer log; ESTIMATED = arithmetic from the quote; REVERSAL = a negative correction. An operator reading a revenue report has to know which rows are evidence and which are inference",
            },
            logIndex: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                comment: "Which Transfer log in the receipt proved this accrual. NULL for ESTIMATED and REVERSAL rows",
            },
            usdRateSource: {
                type: sequelize_1.DataTypes.STRING(24),
                allowNull: true,
                validate: { isIn: [["MARKETDATA", "USD_RATES"]] },
                comment: "Where amountUsd came from. NULL means amountUsd is NULL — which means UNPRICED, and is NOT the same as zero",
            },
            sweepStatus: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "ACCRUED",
                validate: {
                    isIn: [["ACCRUED", "SWEEP_SUBMITTED", "SWEPT", "UNRECOVERABLE"]],
                },
            },
            sweepSubmittedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
            sweepAttempts: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: "collectPlatformFee returns null on failure rather than throwing, so a failed settle must be counted here and retried — never marked SWEPT",
            },
            creditedTransactionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "The wallet transaction the sweep credited",
            },
            adminProfitId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "The adminProfit row of type DEX_SWAP this accrual settled into",
            },
            creditedAmount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                get() {
                    const v = this.getDataValue("creditedAmount");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "What actually reached collectPlatformFee after 8dp rounding. LOSSY BY DEFINITION — the residue is in roundingResidueRaw",
            },
            roundingResidueRaw: {
                type: sequelize_1.DataTypes.STRING(79),
                allowNull: true,
                validate: { is: units_1.SIGNED_RAW_AMOUNT_RE },
                comment: "amountRaw minus creditedAmount re-expanded. The chain and the ledger reconcile only if this is carried; roundToPrecision would otherwise eat it silently",
            },
            reversalOfId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Set on a REVERSAL row: the accrual it negates. UNIQUE, so one reversal per accrual is a database fact rather than a code convention",
            },
            sweepFailureReason: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "WHY a row is UNRECOVERABLE. A machine code, not prose: the console maps it to an explanation and a remedy, and the operator never has to read a log to learn which of four things went wrong",
            },
            sweptAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "Landing zone for the future sweep tool — this addon never moves the funds itself",
            },
            sweepTxHash: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_TX_ID_COLUMN_WIDTH),
                allowNull: true,
                validate: {
                    txIdMatchesVm(value) {
                        var _a;
                        if (value === null || value === undefined || value === "")
                            return;
                        if (!(0, units_1.isTxIdValidForVm)(this.vm, String(value))) {
                            throw new Error(`dexFeeAccrual.sweepTxHash is not a valid ${(_a = this.vm) !== null && _a !== void 0 ? _a : "EVM"} transaction id`);
                        }
                    },
                },
                set(value) {
                    this.setDataValue("sweepTxHash", (0, units_1.normalizeChainTxIdValue)(value));
                },
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
            modelName: "dexFeeAccrual",
            tableName: "dex_fee_accrual",
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
                    name: "dexFeeAccrualSwapLogKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "swapId" }, { name: "logIndex" }],
                },
                {
                    name: "dexFeeAccrualRollupIdx",
                    using: "BTREE",
                    fields: [{ name: "chainId" }, { name: "tokenAddress" }, { name: "createdAt" }],
                },
                {
                    name: "dexFeeAccrualReversalOfKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "reversalOfId" }],
                },
                {
                    name: "dexFeeAccrualSweepIdx",
                    using: "BTREE",
                    fields: [{ name: "sweepStatus" }, { name: "chainId" }, { name: "tokenAddress" }],
                },
                {
                    name: "dexFeeAccrualSweptIdx",
                    using: "BTREE",
                    fields: [{ name: "sweptAt" }],
                },
                {
                    name: "dexFeeAccrualUserIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
            ],
        });
    }
    static associate(models) {
        dexFeeAccrual.belongsTo(models.dexSwap, {
            as: "swap",
            foreignKey: "swapId",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        dexFeeAccrual.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        dexFeeAccrual.belongsTo(models.dexToken, {
            as: "token",
            foreignKey: "tokenId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = dexFeeAccrual;
