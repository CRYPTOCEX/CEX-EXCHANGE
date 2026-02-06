"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class depositGateway extends sequelize_1.Model {
    static initModel(sequelize) {
        return depositGateway.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                unique: "depositGatewayNameKey",
                validate: {
                    notEmpty: { msg: "name: Name must not be empty" },
                },
            },
            title: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "title: Title must not be empty" },
                },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "description: Description must not be empty" },
                },
            },
            image: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
                validate: {
                    is: {
                        args: ["^/(uploads|img)/.*$", "i"],
                        msg: "image: Image must be a valid URL",
                    },
                },
            },
            alias: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                unique: "depositGatewayAliasKey",
            },
            currencies: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            fixedFee: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                defaultValue: 0,
                get() {
                    const rawData = this.getDataValue("fixedFee");
                    if (rawData === null || rawData === undefined)
                        return 0;
                    if (typeof rawData === 'string') {
                        try {
                            return JSON.parse(rawData);
                        }
                        catch (_a) {
                            return parseFloat(rawData) || 0;
                        }
                    }
                    return rawData;
                },
                set(value) {
                    if (typeof value === 'number') {
                        this.setDataValue("fixedFee", value);
                    }
                    else if (typeof value === 'object' && value !== null) {
                        this.setDataValue("fixedFee", value);
                    }
                    else if (typeof value === 'string') {
                        const parsed = parseFloat(value);
                        this.setDataValue("fixedFee", isNaN(parsed) ? 0 : parsed);
                    }
                    else {
                        this.setDataValue("fixedFee", 0);
                    }
                },
            },
            percentageFee: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                defaultValue: 0,
                get() {
                    const rawData = this.getDataValue("percentageFee");
                    if (rawData === null || rawData === undefined)
                        return 0;
                    if (typeof rawData === 'string') {
                        try {
                            return JSON.parse(rawData);
                        }
                        catch (_a) {
                            return parseFloat(rawData) || 0;
                        }
                    }
                    return rawData;
                },
                set(value) {
                    if (typeof value === 'number') {
                        this.setDataValue("percentageFee", value);
                    }
                    else if (typeof value === 'object' && value !== null) {
                        this.setDataValue("percentageFee", value);
                    }
                    else if (typeof value === 'string') {
                        const parsed = parseFloat(value);
                        this.setDataValue("percentageFee", isNaN(parsed) ? 0 : parsed);
                    }
                    else {
                        this.setDataValue("percentageFee", 0);
                    }
                },
            },
            minAmount: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                defaultValue: 0,
                get() {
                    const rawData = this.getDataValue("minAmount");
                    if (rawData === null || rawData === undefined)
                        return 0;
                    if (typeof rawData === 'string') {
                        try {
                            return JSON.parse(rawData);
                        }
                        catch (_a) {
                            return parseFloat(rawData) || 0;
                        }
                    }
                    return rawData;
                },
                set(value) {
                    if (typeof value === 'number') {
                        this.setDataValue("minAmount", value);
                    }
                    else if (typeof value === 'object' && value !== null) {
                        this.setDataValue("minAmount", value);
                    }
                    else if (typeof value === 'string') {
                        const parsed = parseFloat(value);
                        this.setDataValue("minAmount", isNaN(parsed) ? 0 : parsed);
                    }
                    else {
                        this.setDataValue("minAmount", 0);
                    }
                },
            },
            maxAmount: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const rawData = this.getDataValue("maxAmount");
                    if (rawData === null || rawData === undefined)
                        return null;
                    if (typeof rawData === 'string') {
                        try {
                            return JSON.parse(rawData);
                        }
                        catch (_a) {
                            const parsed = parseFloat(rawData);
                            return isNaN(parsed) ? null : parsed;
                        }
                    }
                    return rawData;
                },
                set(value) {
                    if (typeof value === 'number') {
                        this.setDataValue("maxAmount", value);
                    }
                    else if (typeof value === 'object' && value !== null) {
                        this.setDataValue("maxAmount", value);
                    }
                    else if (typeof value === 'string') {
                        const parsed = parseFloat(value);
                        this.setDataValue("maxAmount", isNaN(parsed) ? null : parsed);
                    }
                    else {
                        this.setDataValue("maxAmount", null);
                    }
                },
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("FIAT", "CRYPTO"),
                allowNull: false,
                defaultValue: "FIAT",
                validate: {
                    isIn: {
                        args: [["FIAT", "CRYPTO"]],
                        msg: "type: Must be either 'FIAT' or 'CRYPTO'",
                    },
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
            version: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                defaultValue: "0.0.1",
            },
            productId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                unique: "depositGatewayProductIdKey",
                validate: {
                    isUUID: {
                        args: 4,
                        msg: "productId: Product ID must be a valid UUID",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "depositGateway",
            tableName: "deposit_gateway",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "depositGatewayNameKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "name" }],
                },
                {
                    name: "depositGatewayAliasKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "alias" }],
                },
                {
                    name: "depositGatewayProductIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "productId" }],
                },
            ],
        });
    }
    static associate(models) { }
    getFixedFee(currency) {
        if (typeof this.fixedFee === 'number')
            return this.fixedFee;
        if (typeof this.fixedFee === 'object' && this.fixedFee && currency) {
            return this.fixedFee[currency.toUpperCase()] || 0;
        }
        return 0;
    }
    getPercentageFee(currency) {
        if (typeof this.percentageFee === 'number')
            return this.percentageFee;
        if (typeof this.percentageFee === 'object' && this.percentageFee && currency) {
            return this.percentageFee[currency.toUpperCase()] || 0;
        }
        return 0;
    }
    getMinAmount(currency) {
        if (typeof this.minAmount === 'number')
            return this.minAmount;
        if (typeof this.minAmount === 'object' && this.minAmount && currency) {
            return this.minAmount[currency.toUpperCase()] || 0;
        }
        return 0;
    }
    getMaxAmount(currency) {
        if (typeof this.maxAmount === 'number')
            return this.maxAmount;
        if (typeof this.maxAmount === 'object' && this.maxAmount && currency) {
            return this.maxAmount[currency.toUpperCase()] || null;
        }
        return null;
    }
}
exports.default = depositGateway;
