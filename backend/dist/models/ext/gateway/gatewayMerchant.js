"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class gatewayMerchant extends sequelize_1.Model {
    static initModel(sequelize) {
        return gatewayMerchant.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
                },
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Business name must not be empty" },
                    len: { args: [2, 191], msg: "name: Must be between 2 and 191 characters" },
                },
            },
            slug: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            logo: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
            },
            website: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                validate: {
                    isValidUrl(value) {
                        if (value && !/^https?:\/\/.+/.test(value)) {
                            throw new Error("website: Must be a valid URL");
                        }
                    },
                },
            },
            email: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    isEmail: { msg: "email: Must be a valid email address" },
                },
            },
            phone: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
            },
            address: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            city: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
            },
            state: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
            },
            country: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
            },
            postalCode: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: true,
            },
            apiKey: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
            },
            secretKey: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
            },
            webhookSecret: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
            },
            testMode: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            allowedCurrencies: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                defaultValue: ["USD"],
                get() {
                    const value = this.getDataValue("allowedCurrencies");
                    return typeof value === "string" ? JSON.parse(value) : value;
                },
            },
            allowedWalletTypes: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                defaultValue: ["FIAT"],
                get() {
                    const value = this.getDataValue("allowedWalletTypes");
                    return typeof value === "string" ? JSON.parse(value) : value;
                },
            },
            defaultCurrency: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "USD",
            },
            feeType: {
                type: sequelize_1.DataTypes.ENUM("PERCENTAGE", "FIXED", "BOTH"),
                allowNull: false,
                defaultValue: "BOTH",
            },
            feePercentage: {
                type: sequelize_1.DataTypes.DECIMAL(10, 4),
                allowNull: false,
                defaultValue: 2.9,
                get() {
                    const value = this.getDataValue("feePercentage");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            feeFixed: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                defaultValue: 0.30,
                get() {
                    const value = this.getDataValue("feeFixed");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            payoutSchedule: {
                type: sequelize_1.DataTypes.ENUM("INSTANT", "DAILY", "WEEKLY", "MONTHLY"),
                allowNull: false,
                defaultValue: "DAILY",
            },
            payoutThreshold: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                defaultValue: 100,
                get() {
                    const value = this.getDataValue("payoutThreshold");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            payoutWalletId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "ACTIVE", "SUSPENDED", "REJECTED"),
                allowNull: false,
                defaultValue: "PENDING",
            },
            verificationStatus: {
                type: sequelize_1.DataTypes.ENUM("UNVERIFIED", "PENDING", "VERIFIED"),
                allowNull: false,
                defaultValue: "UNVERIFIED",
            },
            dailyLimit: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                defaultValue: 10000,
                get() {
                    const value = this.getDataValue("dailyLimit");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            monthlyLimit: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                defaultValue: 100000,
                get() {
                    const value = this.getDataValue("monthlyLimit");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            transactionLimit: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                defaultValue: 5000,
                get() {
                    const value = this.getDataValue("transactionLimit");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            metadata: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("metadata");
                    return typeof value === "string" ? JSON.parse(value) : value;
                },
            },
        }, {
            sequelize,
            modelName: "gatewayMerchant",
            tableName: "gateway_merchant",
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
                    name: "gatewayMerchantUserIdFkey",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "gatewayMerchantApiKeyUnique",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "apiKey" }],
                },
                {
                    name: "gatewayMerchantSecretKeyUnique",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "secretKey" }],
                },
                {
                    name: "gatewayMerchantSlugUnique",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "slug" }],
                },
                {
                    name: "gatewayMerchantStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
            ],
            hooks: {
                async beforeValidate(merchant) {
                    if (!merchant.slug && merchant.name) {
                        merchant.slug = await gatewayMerchant.generateUniqueSlug(merchant.name);
                    }
                },
            },
        });
    }
    static associate(models) {
        gatewayMerchant.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        gatewayMerchant.hasMany(models.gatewayApiKey, {
            as: "gatewayApiKeys",
            foreignKey: "merchantId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        gatewayMerchant.hasMany(models.gatewayPayment, {
            as: "gatewayPayments",
            foreignKey: "merchantId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        gatewayMerchant.hasMany(models.gatewayRefund, {
            as: "gatewayRefunds",
            foreignKey: "merchantId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        gatewayMerchant.hasMany(models.gatewayWebhook, {
            as: "gatewayWebhooks",
            foreignKey: "merchantId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        gatewayMerchant.hasMany(models.gatewayPayout, {
            as: "gatewayPayouts",
            foreignKey: "merchantId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        gatewayMerchant.hasMany(models.gatewayMerchantBalance, {
            as: "gatewayMerchantBalances",
            foreignKey: "merchantId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
    static async generateUniqueSlug(name) {
        const baseSlug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        let uniqueSlug = baseSlug;
        let counter = 1;
        while (await gatewayMerchant.findOne({ where: { slug: uniqueSlug } })) {
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
        }
        return uniqueSlug;
    }
}
exports.default = gatewayMerchant;
