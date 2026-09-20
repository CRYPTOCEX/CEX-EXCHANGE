"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class dexProvider extends sequelize_1.Model {
    static initModel(sequelize) {
        return dexProvider.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
                validate: {
                    isIn: [["0x", "1inch", "kyberswap", "lifi", "odos", "jupiter", "sunswap", "stonfi", "mock"]],
                },
                comment: "Adapter registry key — the vendor's own spelling, e.g. 0x",
            },
            title: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "Operator activation — an adapter that exists in code is still off until this is true",
            },
            priority: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 100,
                comment: "Lower wins when two providers return an equivalent route",
            },
            version: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
            },
            supportedChainIds: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                defaultValue: "[]",
                set(value) {
                    this.setDataValue("supportedChainIds", typeof value === "string" ? value : JSON.stringify(value));
                },
                get() {
                    const v = this.getDataValue("supportedChainIds");
                    return typeof v === "string" ? JSON.parse(v) : (v !== null && v !== void 0 ? v : []);
                },
                comment: "JSON array of numeric EVM chain ids this adapter can quote",
            },
            apiKeyEnvVar: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "The env var NAME, never the key. The value is read from process.env at call time and never persisted or serialised",
            },
            baseUrl: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            feeMode: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: true,
                validate: { isIn: [["BUY", "SELL", "CONFIGURABLE", "ONCHAIN_REFERRAL"]] },
                comment: "Which side of the trade this router can take a fee on. ONCHAIN_REFERRAL means the fee is registered on chain, not passed per quote",
            },
            lastVerifiedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "Last successful probe from the setup console",
            },
            lastError: {
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
            modelName: "dexProvider",
            tableName: "dex_provider",
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
                    name: "dexProviderNameKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "name" }],
                },
                {
                    name: "dexProviderStatusPriorityIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }, { name: "priority" }],
                },
            ],
        });
    }
    static associate(_models) {
    }
}
exports.default = dexProvider;
