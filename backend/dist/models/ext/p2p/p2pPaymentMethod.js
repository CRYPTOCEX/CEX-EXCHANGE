"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class p2pPaymentMethod extends sequelize_1.Model {
    static initModel(sequelize) {
        return p2pPaymentMethod.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "buyerId must be a valid UUID" },
                },
            },
            name: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "Payment method name must not be empty" },
                },
            },
            icon: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: { notEmpty: { msg: "Icon URL must not be empty" } },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            instructions: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
            },
            metadata: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "Flexible key-value pairs for payment details (e.g., PayPal Email, Bank Account, etc.)",
                get() {
                    const rawValue = this.getDataValue("metadata");
                    if (!rawValue)
                        return null;
                    if (typeof rawValue === "string") {
                        try {
                            return JSON.parse(rawValue);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return rawValue;
                },
            },
            processingTime: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
            },
            fees: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
            },
            available: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            isGlobal: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "If true, this payment method is available to all users (created by admin)",
            },
            popularityRank: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
        }, {
            sequelize,
            modelName: "p2pPaymentMethod",
            tableName: "p2p_payment_methods",
            timestamps: true,
            paranoid: true,
        });
    }
    static associate(models) {
        p2pPaymentMethod.belongsToMany(models.p2pOffer, {
            through: "p2p_offer_payment_method",
            as: "offers",
            foreignKey: "paymentMethodId",
            otherKey: "offerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pPaymentMethod.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = p2pPaymentMethod;
