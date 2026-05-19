"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class gasHistory extends sequelize_1.Model {
    static initModel(sequelize) {
        return gasHistory.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
            },
            gasPrice: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: false,
            },
            baseFee: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
            },
            priorityFee: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
            },
            timestamp: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
        }, {
            sequelize,
            modelName: "gasHistory",
            tableName: "gas_history",
            timestamps: true,
            indexes: [
                { fields: ["chain", "timestamp"] },
                { fields: ["timestamp"] },
            ],
        });
    }
    static associate(_models) {
    }
}
exports.default = gasHistory;
