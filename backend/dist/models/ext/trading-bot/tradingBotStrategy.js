"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class tradingBotStrategy extends sequelize_1.Model {
    static initModel(sequelize) {
        return tradingBotStrategy.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            creatorId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "creatorId: Creator ID must not be empty" },
                    isUUID: { args: 4, msg: "creatorId: Must be a valid UUID" },
                },
            },
            name: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Strategy name must not be empty" },
                    len: {
                        args: [1, 100],
                        msg: "name: Strategy name must be between 1 and 100 characters",
                    },
                },
            },
            slug: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "slug: Slug must not be empty" },
                },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "description: Description must not be empty" },
                },
            },
            shortDescription: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            icon: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            coverImage: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("DCA", "GRID", "INDICATOR", "TRAILING_STOP", "CUSTOM"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["DCA", "GRID", "INDICATOR", "TRAILING_STOP", "CUSTOM"]],
                        msg: "type: Must be a valid strategy type",
                    },
                },
            },
            category: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
            },
            tags: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                defaultValue: [],
            },
            defaultConfig: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
            },
            customNodes: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            recommendedSymbols: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                defaultValue: [],
            },
            recommendedTimeframe: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: true,
            },
            minAllocation: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                defaultValue: 100,
                get() {
                    const value = this.getDataValue("minAllocation");
                    return value ? parseFloat(value.toString()) : 100;
                },
            },
            riskLevel: {
                type: sequelize_1.DataTypes.ENUM("LOW", "MEDIUM", "HIGH"),
                allowNull: false,
                defaultValue: "MEDIUM",
                validate: {
                    isIn: {
                        args: [["LOW", "MEDIUM", "HIGH"]],
                        msg: "riskLevel: Must be LOW, MEDIUM, or HIGH",
                    },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"),
                allowNull: false,
                defaultValue: "DRAFT",
                validate: {
                    isIn: {
                        args: [["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"]],
                        msg: "status: Must be a valid status",
                    },
                },
            },
            visibility: {
                type: sequelize_1.DataTypes.ENUM("PRIVATE", "PUBLIC"),
                allowNull: false,
                defaultValue: "PRIVATE",
                validate: {
                    isIn: {
                        args: [["PRIVATE", "PUBLIC"]],
                        msg: "visibility: Must be PRIVATE or PUBLIC",
                    },
                },
            },
            price: {
                type: sequelize_1.DataTypes.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("price");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "USDT",
            },
            isFeatured: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            featuredOrder: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            totalPurchases: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            totalUsers: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            avgRating: {
                type: sequelize_1.DataTypes.DECIMAL(3, 2),
                allowNull: true,
                get() {
                    const value = this.getDataValue("avgRating");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            totalRatings: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            totalRevenue: {
                type: sequelize_1.DataTypes.DECIMAL(18, 2),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("totalRevenue");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            creatorRevenue: {
                type: sequelize_1.DataTypes.DECIMAL(18, 2),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("creatorRevenue");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            platformRevenue: {
                type: sequelize_1.DataTypes.DECIMAL(18, 2),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("platformRevenue");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            reviewedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            reviewedBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            rejectionReason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            version: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "1.0.0",
            },
            changelog: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "tradingBotStrategy",
            tableName: "trading_bot_strategy",
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
                    name: "tradingBotStrategySlugIdx",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "slug" }],
                },
                {
                    name: "tradingBotStrategyCreatorIdIdx",
                    using: "BTREE",
                    fields: [{ name: "creatorId" }],
                },
                {
                    name: "tradingBotStrategyStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "tradingBotStrategyVisibilityIdx",
                    using: "BTREE",
                    fields: [{ name: "visibility" }],
                },
                {
                    name: "tradingBotStrategyTypeIdx",
                    using: "BTREE",
                    fields: [{ name: "type" }],
                },
                {
                    name: "tradingBotStrategyFeaturedIdx",
                    using: "BTREE",
                    fields: [{ name: "isFeatured" }],
                },
            ],
        });
    }
    static associate(models) {
        tradingBotStrategy.belongsTo(models.user, {
            as: "creator",
            foreignKey: "creatorId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        tradingBotStrategy.hasMany(models.tradingBotPurchase, {
            as: "purchases",
            foreignKey: "strategyId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = tradingBotStrategy;
