"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const units_1 = require("@b/utils/dex/units");
class dexChain extends sequelize_1.Model {
    static initModel(sequelize) {
        return dexChain.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            chainId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                comment: "Numeric chain id. EIP-155 on EVM; a fitted synthetic id on chains that have none (Solana = 1399811149) because this column is INTEGER and the registry ids in circulation overflow it",
            },
            vm: {
                type: sequelize_1.DataTypes.STRING(8),
                allowNull: false,
                defaultValue: "EVM",
                validate: { isIn: [[...units_1.DEX_VM_VALUES]] },
                comment: "Virtual machine. Decides address encoding, tx-id shape, whether confirmations count, and whether lowercasing an address destroys it",
            },
            key: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: true,
                comment: "Ecosystem ChainSymbol (ETH, BSC, POLYGON, OPTIMISM, ARBITRUM, BASE) when one exists. NULL is meaningful: it disables the boot cross-check against chainConfigs, which is correct for a chain the ecosystem has no symbol for. A placeholder symbol would make that check compare against nothing",
            },
            slug: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
                comment: 'Aggregator/indexer path segment — "ethereum", "base"',
            },
            name: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "New chains are off until an operator enables them",
            },
            rpcUrlOverride: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                comment: "Server-side RPC. MAY CONTAIN A KEY (Alchemy and Infura embed it in the path) — never serialise this column to a client",
            },
            publicRpcUrl: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                comment: "Browser-side RPC, keyless. A separate column on purpose: one field for both is how an operator leaks a keyed URL into a JS bundle",
            },
            explorerUrl: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            requiredConfirmations: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 3,
            },
            feeRecipient: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_ADDRESS_COLUMN_WIDTH),
                allowNull: true,
                validate: {
                    addressMatchesVm(value) {
                        var _a;
                        if (value === null || value === undefined || value === "")
                            return;
                        if (!(0, units_1.isAddressValidForVm)(this.vm, String(value))) {
                            throw new Error(`dexChain.feeRecipient is not a valid ${(_a = this.vm) !== null && _a !== void 0 ? _a : "EVM"} address`);
                        }
                    },
                },
                set(value) {
                    this.setDataValue("feeRecipient", (0, units_1.normalizeChainAddressValue)(value));
                },
                comment: "Address the integrator fee accrues to on this chain. EVM: lowercase, render with getAddress(). SVM: base58 VERBATIM — lowercasing changes which account it is",
            },
            zeroFeeAcknowledged: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "Operator has explicitly accepted running this chain at 0 bps. Without it, an enabled chain with dexFeeBps > 0 and no feeRecipient REFUSES to quote (see utils/fee.ts)",
            },
            feeRecipientUpdatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "When feeRecipient last changed. Read by the fee console, never by the quote path",
            },
            wrappedNative: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_ADDRESS_COLUMN_WIDTH),
                allowNull: false,
                validate: {
                    addressMatchesVm(value) {
                        var _a;
                        if (!(0, units_1.isAddressValidForVm)(this.vm, String(value !== null && value !== void 0 ? value : ""))) {
                            throw new Error(`dexChain.wrappedNative is not a valid ${(_a = this.vm) !== null && _a !== void 0 ? _a : "EVM"} address`);
                        }
                    },
                },
                set(value) {
                    this.setDataValue("wrappedNative", (0, units_1.normalizeChainAddressValue)(value));
                },
                comment: "EVM: the WETH-equivalent a native swap routes through. SVM: wrapped SOL's real mint, which aggregators quote directly — not a translation target",
            },
            nativeSymbol: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
            },
            nativeDecimals: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 18,
            },
            aggregatorSupport: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                set(value) {
                    this.setDataValue("aggregatorSupport", typeof value === "string" ? value : JSON.stringify(value));
                },
                get() {
                    const v = this.getDataValue("aggregatorSupport");
                    return typeof v === "string" ? JSON.parse(v) : (v !== null && v !== void 0 ? v : null);
                },
                comment: 'Per-aggregator availability on this chain, keyed by dexProvider.name: "0x", "1inch", "kyberswap", "lifi", "odos"',
            },
            odosReferralCode: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                comment: "Odos on-chain referral code registered for this chain",
            },
            odosReferralTxHash: {
                type: sequelize_1.DataTypes.STRING(66),
                allowNull: true,
                set(value) {
                    this.setDataValue("odosReferralTxHash", typeof value === "string" ? value.toLowerCase() : value);
                },
                comment: "Registration transaction, verified from its receipt",
            },
            odosReferralVerifiedAt: {
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
            modelName: "dexChain",
            tableName: "dex_chain",
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
                    name: "dexChainChainIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "chainId" }],
                },
                {
                    name: "dexChainOdosReferralTxKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "odosReferralTxHash" }],
                },
                {
                    name: "dexChainStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
            ],
        });
    }
    static associate(_models) {
    }
}
exports.default = dexChain;
