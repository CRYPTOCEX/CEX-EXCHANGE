"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class oneTimeToken extends sequelize_1.Model {
    static initModel(sequelize) {
        return oneTimeToken.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            tokenId: {
                type: sequelize_1.DataTypes.STRING(60),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "tokenId: Token ID cannot be empty" },
                },
            },
            tokenType: {
                type: sequelize_1.DataTypes.ENUM("RESET"),
                allowNull: true,
                validate: {
                    isIn: {
                        args: [["RESET"]],
                        msg: "tokenType: Token type must be RESET",
                    },
                },
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: {
                        msg: "expiresAt: Expires At must be a valid date",
                        args: true,
                    },
                },
            },
        }, {
            sequelize,
            modelName: "oneTimeToken",
            tableName: "one_time_token",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "tokenId",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "tokenId" }],
                },
            ],
        });
    }
    static associate(models) { }
}
exports.default = oneTimeToken;
