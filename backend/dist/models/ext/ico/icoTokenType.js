"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class icoTokenType extends sequelize_1.Model {
    static initModel(sequelize) {
        return icoTokenType.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Token type name must not be empty" },
                },
            },
            value: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "value: Token type value must not be empty" },
                },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "description: Description must not be empty" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        }, {
            sequelize,
            modelName: "icoTokenType",
            tableName: "ico_token_type",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "icoTokenTypeNameKey",
                    unique: true,
                    fields: [{ name: "name" }],
                },
            ],
        });
    }
    static associate(models) {
        icoTokenType.hasMany(models.icoTokenOffering, {
            foreignKey: "typeId",
            as: "offerings",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = icoTokenType;
