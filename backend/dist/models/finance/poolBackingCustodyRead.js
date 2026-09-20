"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class poolBackingCustodyRead extends sequelize_1.Model {
    static initModel(sequelize) {
        return poolBackingCustodyRead.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            currency: { type: sequelize_1.DataTypes.STRING(191), allowNull: false },
            chain: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
            address: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                comment: "The on-chain address (or, for Monero, the wallet file's primary address)",
            },
            walletId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "The ECO wallet that owns the address; NULL for the master and custodial contracts",
            },
            kind: {
                type: sequelize_1.DataTypes.ENUM("treasury", "master", "custodial", "customer"),
                allowNull: false,
                comment: "treasury and master are read every run; custodial every run; customers in a rotating slice",
            },
            balance: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "The last successful figure in the currency's unit; NULL = never read. A failed read never writes 0",
            },
            readAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "When `balance` was read; the rotation picks the oldest (NULL first)",
            },
            error: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "The last attempt's failure, cleared by the next success",
            },
            attemptedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "When the address was last READ OR TRIED; the rotation orders on this (NULL first, then oldest), so an address that fails every run still yields its turn instead of holding the whole slice",
            },
            source: {
                type: sequelize_1.DataTypes.ENUM("chain", "utxo_pool", "mirror"),
                allowNull: false,
                defaultValue: "chain",
                comment: "chain = RPC read; utxo_pool = Σ UNSPENT ecosystemUtxo; mirror = the wallet's own map figure (not an on-chain fact)",
            },
        }, {
            sequelize,
            modelName: "poolBackingCustodyRead",
            tableName: "pool_backing_custody_read",
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
                    name: "uq_pool_backing_custody_read_address",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "currency" }, { name: "chain" }, { name: "address" }],
                },
                {
                    name: "idx_pool_backing_custody_read_readAt",
                    using: "BTREE",
                    fields: [{ name: "currency" }, { name: "chain" }, { name: "readAt" }],
                },
                {
                    name: "idx_pool_backing_custody_read_attemptedAt",
                    using: "BTREE",
                    fields: [{ name: "currency" }, { name: "chain" }, { name: "attemptedAt" }],
                },
            ],
        });
    }
    static associate(_models) {
    }
}
exports.default = poolBackingCustodyRead;
