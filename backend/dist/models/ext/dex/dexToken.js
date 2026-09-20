"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const units_1 = require("@b/utils/dex/units");
class dexToken extends sequelize_1.Model {
    static initModel(sequelize) {
        return dexToken.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
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
                comment: "Decides address encoding. Denormalised because a validator runs inside the model, where the chain registry is a boot-time import cycle",
            },
            address: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_ADDRESS_COLUMN_WIDTH),
                allowNull: false,
                validate: {
                    addressMatchesVm(value) {
                        var _a;
                        if (!(0, units_1.isAddressValidForVm)(this.vm, String(value !== null && value !== void 0 ? value : ""))) {
                            throw new Error(`dexToken.address is not a valid ${(_a = this.vm) !== null && _a !== void 0 ? _a : "EVM"} address`);
                        }
                    },
                },
                set(value) {
                    this.setDataValue("address", (0, units_1.normalizeChainAddressValue)(value));
                },
                comment: "Contract address. EVM: lowercase, and the native asset uses the aggregator sentinel 0xeeee...eeee so it is a real value and the chain+address unique index still holds. SVM: the MINT, base58 verbatim. TVM/TON: base58/base64 verbatim — case is data",
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(128),
                allowNull: false,
            },
            decimals: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: { min: 0, max: 36 },
                comment: "Load-bearing and silently wrong when wrong: every raw<->display conversion scales by it, so an off-by-one moves the decimal point on a real transfer. Validated against an on-chain decimals() call before a token is allowlisted",
            },
            isNative: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            logoUrl: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
            },
            coingeckoId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "Operator on/off switch — axis 1 of 3",
            },
            listing: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
                defaultValue: "PENDING",
                validate: { isIn: [["PENDING", "ALLOWLISTED", "DENYLISTED"]] },
                comment: "The curation decision, made by a human — axis 2 of 3",
            },
            origin: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
                defaultValue: "EXTERNAL",
                validate: { isIn: [["EXTERNAL", "OPERATOR_ISSUED"]] },
                comment: "OPERATOR_ISSUED drives the mandatory conflict disclosure. Issuer, market maker and interface operator in one entity, on a token whose supply that entity can increase, is a configuration that should be reached deliberately rather than by ticking three unrelated switches on three pages",
            },
            issuerUserId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Who deployed it, when we know. SET NULL — the token outlives the account",
            },
            mintable: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                comment: "NULL = NOT YET PROBED, and null is a third value rather than a soft false. PROBED FROM BYTECODE, never from operator input. A PROXY records null with probeReason PROXY_UNDECIDABLE: selector-presence is positive evidence, but selector-ABSENCE is evidence of absence only for a non-proxy contract, and a confident `false` on a contract whose implementation can be swapped is worse than an honest unknown",
            },
            directPoolOnly: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "Unquotable while dexDirectPoolsEnabled is off, with its own refusal reason rather than folded into a generic one",
            },
            riskLevel: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: true,
                validate: { isIn: [["SAFE", "CAUTION", "BLOCKED"]] },
                comment: "The machine verdict from screening — axis 3 of 3",
            },
            riskScore: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                validate: { min: 0, max: 100 },
            },
            riskSource: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
                comment: "Screening provider that produced riskLevel/riskScore",
            },
            riskFlags: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                set(value) {
                    this.setDataValue("riskFlags", typeof value === "string" ? value : JSON.stringify(value));
                },
                get() {
                    const v = this.getDataValue("riskFlags");
                    return typeof v === "string" ? JSON.parse(v) : (v !== null && v !== void 0 ? v : null);
                },
                comment: 'JSON array of slugs: "honeypot", "high_sell_tax", "proxy_upgradeable", "low_liquidity"',
            },
            riskCheckedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "Drives the staleness refusal — a token whose screening is older than the configured window is not quotable",
            },
            verifiedSource: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
                defaultValue: "MANUAL",
                validate: { isIn: [["MANUAL", "TOKENLIST", "AGGREGATOR"]] },
                comment: "How this row entered the catalog",
            },
            ecosystemTokenId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Soft link to the custodial catalog for operators who list the same asset in both. Never used to resolve a wallet",
            },
            sortOrder: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            notes: {
                type: sequelize_1.DataTypes.TEXT,
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
            modelName: "dexToken",
            tableName: "dex_token",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "dexTokenChainAddressKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "chainId" }, { name: "address" }],
                },
                {
                    name: "dexTokenPickerIdx",
                    using: "BTREE",
                    fields: [{ name: "chainId" }, { name: "status" }, { name: "listing" }],
                },
                {
                    name: "dexTokenSymbolIdx",
                    using: "BTREE",
                    fields: [{ name: "symbol" }],
                },
                {
                    name: "dexTokenRiskCheckedAtIdx",
                    using: "BTREE",
                    fields: [{ name: "riskCheckedAt" }],
                },
            ],
        });
    }
    static associate(models) {
        dexToken.belongsTo(models.ecosystemToken, {
            as: "ecosystemToken",
            foreignKey: "ecosystemTokenId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = dexToken;
