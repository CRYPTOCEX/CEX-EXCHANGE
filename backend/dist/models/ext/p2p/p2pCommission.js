"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class p2pCommission extends sequelize_1.Model {
    static initModel(sequelize) {
        return p2pCommission.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            adminId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "adminId cannot be null" },
                    isUUID: { args: 4, msg: "adminId must be a valid UUID" },
                },
            },
            amount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isFloat: { msg: "amount must be a valid number" },
                    min: { args: [0], msg: "amount cannot be negative" },
                },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            tradeId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "tradeId must be a valid UUID" },
                },
            },
            offerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "offerId must be a valid UUID" },
                },
            },
        }, {
            sequelize,
            modelName: "p2pCommission",
            tableName: "p2p_commissions",
            timestamps: true,
            paranoid: true,
        });
    }
    static associate(models) {
        p2pCommission.belongsTo(models.user, {
            as: "admin",
            foreignKey: "adminId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        if (models.p2pTrade) {
            p2pCommission.belongsTo(models.p2pTrade, {
                as: "trade",
                foreignKey: "tradeId",
                onDelete: "SET NULL",
                onUpdate: "CASCADE",
            });
        }
        if (models.p2pOffer) {
            p2pCommission.belongsTo(models.p2pOffer, {
                as: "offer",
                foreignKey: "offerId",
                onDelete: "SET NULL",
                onUpdate: "CASCADE",
            });
        }
    }
}
exports.default = p2pCommission;
