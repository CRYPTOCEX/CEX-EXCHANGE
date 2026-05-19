"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class icoTokenOffering extends sequelize_1.Model {
    static initModel(sequelize) {
        return icoTokenOffering.init({
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
                    notNull: { msg: "userId: User ID cannot be null" },
                    isUUID: {
                        args: 4,
                        msg: "userId: User ID must be a valid UUID",
                    },
                },
            },
            planId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "planId: Plan ID cannot be null" },
                    isUUID: {
                        args: 4,
                        msg: "planId: Plan ID must be a valid UUID",
                    },
                },
            },
            typeId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "typeId: Type ID cannot be null" },
                    isUUID: {
                        args: 4,
                        msg: "typeId: Type ID must be a valid UUID",
                    },
                },
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name must not be empty" },
                },
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "symbol: Symbol must not be empty" },
                },
            },
            icon: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "icon: Icon must not be empty" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "SUCCESS", "FAILED", "UPCOMING", "PENDING", "REJECTED", "DISABLED", "CANCELLED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [
                            [
                                "ACTIVE",
                                "SUCCESS",
                                "FAILED",
                                "UPCOMING",
                                "PENDING",
                                "REJECTED",
                                "DISABLED",
                                "CANCELLED",
                            ],
                        ],
                        msg: "status: Invalid status value",
                    },
                },
            },
            purchaseWalletCurrency: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: "purchaseWalletCurrency: Currency must not be empty",
                    },
                },
            },
            purchaseWalletType: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: "purchaseWalletType: Wallet type must not be empty",
                    },
                },
            },
            tokenPrice: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                validate: {
                    isFloat: { msg: "tokenPrice: Must be a valid number" },
                    min: { args: [0], msg: "tokenPrice: Cannot be negative" },
                },
            },
            targetAmount: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                validate: {
                    isFloat: { msg: "targetAmount: Must be a valid number" },
                    min: { args: [0], msg: "targetAmount: Cannot be negative" },
                },
            },
            startDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: { msg: "startDate: Must be a valid date", args: true },
                },
            },
            endDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: { msg: "endDate: Must be a valid date", args: true },
                },
            },
            participants: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isInt: { msg: "participants: Must be an integer" },
                    min: { args: [0], msg: "participants: Cannot be negative" },
                },
            },
            currentPrice: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                validate: {
                    isFloat: { msg: "currentPrice: Must be a valid number" },
                    min: { args: [0], msg: "currentPrice: Cannot be negative" },
                },
            },
            priceChange: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                validate: {
                    isFloat: { msg: "priceChange: Must be a valid number" },
                },
            },
            submittedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                validate: {
                    isDate: { msg: "submittedAt: Must be a valid date", args: true },
                },
            },
            approvedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                validate: {
                    isDate: { msg: "approvedAt: Must be a valid date", args: true },
                },
            },
            rejectedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                validate: {
                    isDate: { msg: "rejectedAt: Must be a valid date", args: true },
                },
            },
            reviewNotes: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            isPaused: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            isFlagged: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            featured: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
            },
            website: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            cancelledAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            cancelledBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            cancellationReason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "icoTokenOffering",
            tableName: "ico_token_offering",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "icoTokenOfferingSymbolKey",
                    unique: true,
                    fields: [{ name: "symbol" }],
                },
                {
                    name: "icoTokenOfferingUserIdIdx",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "icoTokenOfferingPlanIdIdx",
                    fields: [{ name: "planId" }],
                },
                {
                    name: "icoTokenOfferingTypeIdIdx",
                    fields: [{ name: "typeId" }],
                },
                {
                    name: "icoTokenOfferingStatusIdx",
                    fields: [{ name: "status" }],
                },
            ],
        });
    }
    static associate(models) {
        icoTokenOffering.belongsTo(models.icoLaunchPlan, {
            as: "plan",
            foreignKey: "planId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        icoTokenOffering.hasMany(models.icoTokenOfferingPhase, {
            as: "phases",
            foreignKey: "offeringId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        icoTokenOffering.hasOne(models.icoTokenDetail, {
            as: "tokenDetail",
            foreignKey: "offeringId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        icoTokenOffering.hasMany(models.icoRoadmapItem, {
            as: "roadmapItems",
            foreignKey: "offeringId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        icoTokenOffering.hasMany(models.icoTeamMember, {
            as: "teamMembers",
            foreignKey: "offeringId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        icoTokenOffering.hasMany(models.icoTransaction, {
            as: "transactions",
            foreignKey: "offeringId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        icoTokenOffering.hasMany(models.icoAdminActivity, {
            as: "adminActivities",
            foreignKey: "offeringId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        icoTokenOffering.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        icoTokenOffering.belongsTo(models.icoTokenType, {
            as: "type",
            foreignKey: "typeId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        icoTokenOffering.hasMany(models.icoTokenOfferingUpdate, {
            as: "updates",
            foreignKey: "offeringId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = icoTokenOffering;
