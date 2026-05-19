"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class apiKey extends sequelize_1.Model {
    static initModel(sequelize) {
        return apiKey.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
                },
            },
            name: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: API key name must not be empty" },
                },
            },
            key: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "key: API key must not be empty" },
                },
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("user", "plugin"),
                allowNull: false,
                defaultValue: "user",
            },
            permissions: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                defaultValue: [],
            },
            ipRestriction: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            ipWhitelist: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                defaultValue: [],
            },
        }, {
            sequelize,
            modelName: "apiKey",
            tableName: "api_key",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
            ],
        });
    }
    static associate(models) {
        apiKey.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = apiKey;
