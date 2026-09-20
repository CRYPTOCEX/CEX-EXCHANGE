"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
function decimalGetter(field) {
    return function () {
        const raw = this.getDataValue(field);
        if (raw === null || raw === undefined)
            return raw;
        const n = typeof raw === "number" ? raw : Number(raw);
        return Number.isFinite(n) ? n : 0;
    };
}
class stakingChainWallet extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingChainWallet.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: { notEmpty: { msg: "chain: Chain must not be empty" } },
            },
            network: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
                validate: { notEmpty: { msg: "network: Network must not be empty" } },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: { notEmpty: { msg: "currency: Currency must not be empty" } },
            },
            address: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: { notEmpty: { msg: "address: Address must not be empty" } },
            },
            data: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: { notEmpty: { msg: "data: Encrypted key material must not be empty" } },
            },
            role: {
                type: sequelize_1.DataTypes.ENUM("STAKING"),
                allowNull: false,
                defaultValue: "STAKING",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "FROZEN"),
                allowNull: false,
                defaultValue: "ACTIVE",
                validate: {
                    isIn: { args: [["ACTIVE", "FROZEN"]], msg: "status: Must be one of: ACTIVE, FROZEN" },
                },
            },
            balance: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("balance"),
            },
            gasReserveFloor: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("gasReserveFloor"),
            },
            lastObservedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            frozenAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            frozenBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            frozenReason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            createdBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "stakingChainWallet",
            tableName: "staking_chain_wallets",
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "staking_chain_wallets_chain_network_key",
                    unique: true,
                    fields: [{ name: "chain" }, { name: "network" }],
                },
                { name: "staking_chain_wallets_status_idx", fields: [{ name: "status" }] },
            ],
        });
    }
    static associate(models) {
        stakingChainWallet.hasMany(models.stakingPool, {
            foreignKey: "stakingWalletId",
            as: "pools",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingChainWallet.hasMany(models.stakingChainActivation, {
            foreignKey: "stakingWalletId",
            as: "activations",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingChainWallet;
