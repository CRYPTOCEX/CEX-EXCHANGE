"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
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
                validate: { isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "userId must be a valid UUID" } },
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
            priceWalletType: {
                type: sequelize_1.DataTypes.ENUM("FIAT", "SPOT", "ECO"),
                allowNull: true,
                comment: "Wallet type of priceCurrency. Locates the crypto leg when the asset leg is FIAT; NULL = legacy offer.",
                validate: {
                    isIn: {
                        args: [["FIAT", "SPOT", "ECO"]],
                        msg: "Invalid price wallet type",
                    },
                },
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
                            this.setDataValue('amountConfig', JSON.parse(value));
                        }
                        catch (e) {
                            this.setDataValue('amountConfig', {});
                        }
                    }
                    else if (value !== null && value !== undefined) {
                        this.setDataValue('amountConfig', value);
                    }
                    else {
                        this.setDataValue('amountConfig', {});
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
                            this.setDataValue('priceConfig', JSON.parse(value));
                        }
                        catch (e) {
                            this.setDataValue('priceConfig', {});
                        }
                    }
                    else if (value !== null && value !== undefined) {
                        this.setDataValue('priceConfig', value);
                    }
                    else {
                        this.setDataValue('priceConfig', {});
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
                            this.setDataValue('tradeSettings', JSON.parse(value));
                        }
                        catch (e) {
                            this.setDataValue('tradeSettings', {});
                        }
                    }
                    else if (value !== null && value !== undefined) {
                        this.setDataValue('tradeSettings', value);
                    }
                    else {
                        this.setDataValue('tradeSettings', {});
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
                            this.setDataValue('locationSettings', JSON.parse(value));
                        }
                        catch (e) {
                            this.setDataValue('locationSettings', null);
                        }
                    }
                    else if (typeof value === 'object') {
                        this.setDataValue('locationSettings', value);
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
                            this.setDataValue('userRequirements', JSON.parse(value));
                        }
                        catch (e) {
                            this.setDataValue('userRequirements', null);
                        }
                    }
                    else if (typeof value === 'object') {
                        this.setDataValue('userRequirements', value);
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
            escrowAmount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isFloat: { msg: "escrowAmount must be a valid number" },
                    min: { args: [0], msg: "escrowAmount cannot be negative" },
                },
            },
            views: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            systemTags: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("systemTags");
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
            adminNotes: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            activityLog: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                defaultValue: [],
                get() {
                    const value = this.getDataValue("activityLog");
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
        }, {
            sequelize,
            modelName: "p2pOffer",
            tableName: "p2p_offers",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "idx_p2p_offer_status_type",
                    using: "BTREE",
                    fields: [{ name: "status" }, { name: "type" }],
                },
                {
                    name: "idx_p2p_offer_status_currency",
                    using: "BTREE",
                    fields: [
                        { name: "status" },
                        { name: "currency" },
                        { name: "priceCurrency" },
                    ],
                },
                {
                    name: "idx_p2p_offer_status_createdAt",
                    using: "BTREE",
                    fields: [{ name: "status" }, { name: "createdAt" }],
                },
                {
                    name: "idx_p2p_offer_status_updatedAt",
                    using: "BTREE",
                    fields: [{ name: "status" }, { name: "updatedAt" }],
                },
            ],
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
