"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class p2pOffer extends sequelize_1.Model {
    static initModel(sequelize) {
        return p2pOffer.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: { isUUID: { args: 4, msg: "userId must be a valid UUID" } },
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("BUY", "SELL"),
                allowNull: false,
                validate: {
                    isIn: { args: [["BUY", "SELL"]], msg: "Invalid trade type" },
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: { notEmpty: { msg: "currency must not be empty" } },
            },
            walletType: {
                type: sequelize_1.DataTypes.ENUM("FIAT", "SPOT", "ECO"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["FIAT", "SPOT", "ECO"]],
                        msg: "Invalid wallet type",
                    },
                },
            },
            priceCurrency: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: true,
                comment: "Currency used for pricing (USD, EUR, GBP, etc.)",
            },
            amountConfig: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                get() {
                    const value = this.getDataValue('amountConfig');
                    if (typeof value === 'string') {
                        try {
                            return JSON.parse(value);
                        }
                        catch (e) {
                            return {};
                        }
                    }
                    return value || {};
                },
                set(value) {
                    if (typeof value === 'string') {
                        try {
                            JSON.parse(value);
                            this.setDataValue('amountConfig', value);
                        }
                        catch (e) {
                            this.setDataValue('amountConfig', JSON.stringify({}));
                        }
                    }
                    else if (typeof value === 'object' && value !== null) {
                        this.setDataValue('amountConfig', JSON.stringify(value));
                    }
                    else {
                        this.setDataValue('amountConfig', JSON.stringify({}));
                    }
                }
            },
            priceConfig: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                get() {
                    const value = this.getDataValue('priceConfig');
                    if (typeof value === 'string') {
                        try {
                            return JSON.parse(value);
                        }
                        catch (e) {
                            return {};
                        }
                    }
                    return value || {};
                },
                set(value) {
                    if (typeof value === 'string') {
                        try {
                            JSON.parse(value);
                            this.setDataValue('priceConfig', value);
                        }
                        catch (e) {
                            this.setDataValue('priceConfig', JSON.stringify({}));
                        }
                    }
                    else if (typeof value === 'object' && value !== null) {
                        this.setDataValue('priceConfig', JSON.stringify(value));
                    }
                    else {
                        this.setDataValue('priceConfig', JSON.stringify({}));
                    }
                }
            },
            tradeSettings: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                get() {
                    const value = this.getDataValue('tradeSettings');
                    if (typeof value === 'string') {
                        try {
                            return JSON.parse(value);
                        }
                        catch (e) {
                            return {};
                        }
                    }
                    return value || {};
                },
                set(value) {
                    if (typeof value === 'string') {
                        try {
                            JSON.parse(value);
                            this.setDataValue('tradeSettings', value);
                        }
                        catch (e) {
                            this.setDataValue('tradeSettings', JSON.stringify({}));
                        }
                    }
                    else if (typeof value === 'object' && value !== null) {
                        this.setDataValue('tradeSettings', JSON.stringify(value));
                    }
                    else {
                        this.setDataValue('tradeSettings', JSON.stringify({}));
                    }
                }
            },
            locationSettings: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue('locationSettings');
                    if (value === null)
                        return null;
                    if (typeof value === 'string') {
                        try {
                            return JSON.parse(value);
                        }
                        catch (e) {
                            return null;
                        }
                    }
                    return value;
                },
                set(value) {
                    if (value === null || value === undefined) {
                        this.setDataValue('locationSettings', null);
                    }
                    else if (typeof value === 'string') {
                        try {
                            JSON.parse(value);
                            this.setDataValue('locationSettings', value);
                        }
                        catch (e) {
                            this.setDataValue('locationSettings', null);
                        }
                    }
                    else if (typeof value === 'object') {
                        this.setDataValue('locationSettings', JSON.stringify(value));
                    }
                    else {
                        this.setDataValue('locationSettings', null);
                    }
                }
            },
            userRequirements: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue('userRequirements');
                    if (value === null)
                        return null;
                    if (typeof value === 'string') {
                        try {
                            return JSON.parse(value);
                        }
                        catch (e) {
                            return null;
                        }
                    }
                    return value;
                },
                set(value) {
                    if (value === null || value === undefined) {
                        this.setDataValue('userRequirements', null);
                    }
                    else if (typeof value === 'string') {
                        try {
                            JSON.parse(value);
                            this.setDataValue('userRequirements', value);
                        }
                        catch (e) {
                            this.setDataValue('userRequirements', null);
                        }
                    }
                    else if (typeof value === 'object') {
                        this.setDataValue('userRequirements', JSON.stringify(value));
                    }
                    else {
                        this.setDataValue('userRequirements', null);
                    }
                }
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("DRAFT", "PENDING_APPROVAL", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"),
                allowNull: false,
                defaultValue: "DRAFT",
            },
            views: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            systemTags: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            adminNotes: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            activityLog: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                defaultValue: [],
            },
        }, {
            sequelize,
            modelName: "p2pOffer",
            tableName: "p2p_offers",
            timestamps: true,
            paranoid: true,
        });
    }
    static associate(models) {
        p2pOffer.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pOffer.belongsToMany(models.p2pPaymentMethod, {
            through: "p2p_offer_payment_method",
            as: "paymentMethods",
            foreignKey: "offerId",
            otherKey: "paymentMethodId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pOffer.hasOne(models.p2pOfferFlag, {
            as: "flag",
            foreignKey: "offerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pOffer.hasMany(models.p2pTrade, {
            as: "trades",
            foreignKey: "offerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = p2pOffer;
