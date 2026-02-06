"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class p2pActivityLog extends sequelize_1.Model {
    static initModel(sequelize) {
        return p2pActivityLog.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            type: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: { notEmpty: { msg: "Type must not be empty" } },
            },
            action: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: { notEmpty: { msg: "Action must not be empty" } },
            },
            details: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            relatedEntity: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
            },
            relatedEntityId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "p2pActivityLog",
            tableName: "p2p_activity_logs",
            timestamps: true,
            paranoid: true,
        });
    }
    static associate(models) {
        p2pActivityLog.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = p2pActivityLog;
