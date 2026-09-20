"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
function parseJsonColumn(value) {
    if (value == null || value === "")
        return null;
    let parsed = value;
    try {
        for (let i = 0; i < 2 && typeof parsed === "string"; i++) {
            parsed = JSON.parse(parsed);
        }
    }
    catch (_a) {
        return null;
    }
    return typeof parsed === "object" ? parsed : null;
}
class ecosystemToken extends sequelize_1.Model {
    static initModel(sequelize) {
        return ecosystemToken.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name must not be empty" },
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "currency: Currency must not be empty" },
                },
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "chain: Chain must not be empty" },
                },
            },
            network: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "network: Network must not be empty" },
                },
            },
            contract: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "contract: Contract must not be empty" },
                },
            },
            contractType: {
                type: sequelize_1.DataTypes.ENUM("PERMIT", "NO_PERMIT", "NATIVE"),
                allowNull: false,
                defaultValue: "PERMIT",
                validate: {
                    isIn: {
                        args: [["PERMIT", "NO_PERMIT", "NATIVE"]],
                        msg: "contractType: Contract Type must be one of 'PERMIT', 'NO_PERMIT', or 'NATIVE'",
                    },
                },
            },
            type: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "type: Type must not be empty" },
                },
            },
            decimals: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    isInt: { msg: "decimals: Decimals must be an integer" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                validate: {
                    isBoolean: { msg: "status: Status must be a boolean value" },
                },
            },
            precision: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 8,
            },
            limits: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    return parseJsonColumn(this.getDataValue("limits"));
                },
            },
            fee: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    return parseJsonColumn(this.getDataValue("fee"));
                },
            },
            icon: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
                validate: {
                    is: {
                        args: ["^/(uploads|img|blockchains)/.*$", "i"],
                        msg: "icon: icon must be a valid URL",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "ecosystemToken",
            tableName: "ecosystem_token",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "ecosystemTokenContractChainKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "contract" }, { name: "chain" }],
                },
                {
                    name: "idx_ecosystem_token_currency",
                    using: "BTREE",
                    fields: [{ name: "currency" }],
                },
            ],
        });
    }
    static associate(models) { }
}
exports.default = ecosystemToken;
