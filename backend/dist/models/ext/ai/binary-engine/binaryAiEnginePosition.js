"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class binaryAiEnginePosition extends sequelize_1.Model {
    static initModel(sequelize) {
        return binaryAiEnginePosition.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            engineId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "engineId: Engine ID must not be empty" },
                    isUUID: { args: 4, msg: "engineId: Must be a valid UUID" },
                },
            },
            binaryOrderId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "binaryOrderId: Binary Order ID must not be empty" },
                    isUUID: { args: 4, msg: "binaryOrderId: Must be a valid UUID" },
                },
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "userId: User ID must not be empty" },
                    isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
                },
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "symbol: Symbol must not be empty" },
                },
            },
            side: {
                type: sequelize_1.DataTypes.ENUM("RISE", "FALL"),
                allowNull: false,
            },
            amount: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                validate: {
                    isDecimal: { msg: "amount: Must be a valid decimal number" },
                    min: { args: [0], msg: "amount: Must be greater than 0" },
                },
                get() {
                    const value = this.getDataValue("amount");
                    return value !== null ? parseFloat(value) : 0;
                },
            },
            entryPrice: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                validate: {
                    isDecimal: { msg: "entryPrice: Must be a valid decimal number" },
                    min: { args: [0], msg: "entryPrice: Must be greater than 0" },
                },
                get() {
                    const value = this.getDataValue("entryPrice");
                    return value !== null ? parseFloat(value) : 0;
                },
            },
            expiryTime: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            isDemo: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            userTier: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: true,
            },
            isWhale: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            hasCooldown: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            outcome: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "WIN", "LOSS", "DRAW"),
                allowNull: false,
                defaultValue: "PENDING",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "SETTLED", "CANCELLED"),
                allowNull: false,
                defaultValue: "ACTIVE",
            },
            settledAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            wasManipulated: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            manipulationDetails: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "binaryAiEnginePosition",
            tableName: "binary_ai_engine_position",
            timestamps: true,
            indexes: [
                { fields: ["engineId"] },
                { fields: ["binaryOrderId"], unique: true },
                { fields: ["userId"] },
                { fields: ["expiryTime"] },
                { fields: ["outcome"] },
                { fields: ["isWhale"] },
                { fields: ["userTier"] },
                { fields: ["isDemo"] },
            ],
        });
    }
    static associate(models) {
        binaryAiEnginePosition.belongsTo(models.binaryAiEngine, {
            foreignKey: "engineId",
            as: "engine",
            onDelete: "CASCADE",
        });
        if (models.user) {
            binaryAiEnginePosition.belongsTo(models.user, {
                foreignKey: "userId",
                as: "user",
            });
        }
    }
}
exports.default = binaryAiEnginePosition;
