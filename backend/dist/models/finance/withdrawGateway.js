"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class withdrawGateway extends sequelize_1.Model {
    resolve(raw, currency, fallback = 0) {
        let value = raw;
        if (typeof value === "string") {
            try {
                value = JSON.parse(value);
            }
            catch (_a) {
                const n = parseFloat(value);
                return Number.isFinite(n) ? n : fallback;
            }
        }
        if (value === null || value === undefined)
            return fallback;
        if (typeof value === "number")
            return value;
        if (typeof value === "object" && currency) {
            const v = value[currency.toUpperCase()];
            if (v === null || v === undefined)
                return fallback;
            const n = typeof v === "number" ? v : parseFloat(String(v));
            return Number.isFinite(n) ? n : fallback;
        }
        return fallback;
    }
    getFixedFee(currency) {
        var _a;
        return (_a = this.resolve(this.getDataValue("fixedFee"), currency, 0)) !== null && _a !== void 0 ? _a : 0;
    }
    getPercentageFee(currency) {
        var _a;
        return (_a = this.resolve(this.getDataValue("percentageFee"), currency, 0)) !== null && _a !== void 0 ? _a : 0;
    }
    getMinAmount(currency) {
        var _a;
        return (_a = this.resolve(this.getDataValue("minAmount"), currency, 0)) !== null && _a !== void 0 ? _a : 0;
    }
    getMaxAmount(currency) {
        return this.resolve(this.getDataValue("maxAmount"), currency, null);
    }
    static initModel(sequelize) {
        return withdrawGateway.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                unique: "withdrawGatewayNameKey",
            },
            title: { type: sequelize_1.DataTypes.STRING(191), allowNull: false },
            description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
            image: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
                validate: {
                    is: {
                        args: /^\/(uploads|img)\/.*$/,
                        msg: "image: must be a local /uploads/... or /img/... path",
                    },
                },
            },
            alias: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                unique: "withdrawGatewayAliasKey",
                comment: "Stable identifier used to resolve the adapter",
            },
            status: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
            version: { type: sequelize_1.DataTypes.STRING(191), allowNull: true, defaultValue: "0.0.1" },
            currencies: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("currencies");
                    if (value == null)
                        return [];
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return [];
                        }
                    }
                    return value;
                },
            },
            fixedFee: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true, defaultValue: 0,
                get() {
                    const value = this.getDataValue("fixedFee");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
            },
            percentageFee: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true, defaultValue: 0,
                get() {
                    const value = this.getDataValue("percentageFee");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
            },
            minAmount: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true, defaultValue: 0,
                get() {
                    const value = this.getDataValue("minAmount");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
            },
            maxAmount: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("maxAmount");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
            },
            type: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                defaultValue: "FIAT",
            },
            autoDispatch: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "Dispatch on request instead of waiting for admin approval. Default OFF.",
            },
        }, {
            sequelize,
            modelName: "withdrawGateway",
            tableName: "withdraw_gateway",
            timestamps: true,
            paranoid: false,
            indexes: [
                { name: "withdrawGatewayNameKey", unique: true, fields: [{ name: "name" }] },
                { name: "withdrawGatewayAliasKey", unique: true, fields: [{ name: "alias" }] },
                { name: "withdrawGatewayStatusIdx", fields: [{ name: "status" }] },
            ],
        });
    }
}
exports.default = withdrawGateway;
