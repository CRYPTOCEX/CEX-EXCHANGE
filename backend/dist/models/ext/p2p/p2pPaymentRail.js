"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class p2pPaymentRail extends sequelize_1.Model {
    static initModel(sequelize) {
        return p2pPaymentRail.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "Payment rail name must not be empty" },
                },
            },
            slug: {
                type: sequelize_1.DataTypes.STRING(120),
                allowNull: false,
                unique: "p2p_payment_rails_slug_unique",
                validate: {
                    notEmpty: { msg: "Payment rail slug must not be empty" },
                },
            },
            icon: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            fields: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                defaultValue: [],
                comment: "Ordered field definitions: [{key,label,required,placeholder,help}]. An account stores its values against these keys.",
                get() {
                    const rawValue = this.getDataValue("fields");
                    if (!rawValue)
                        return [];
                    if (typeof rawValue === "string") {
                        try {
                            const parsed = JSON.parse(rawValue);
                            return Array.isArray(parsed) ? parsed : [];
                        }
                        catch (_a) {
                            return [];
                        }
                    }
                    return Array.isArray(rawValue) ? rawValue : [];
                },
            },
            isCustom: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "True when a trader defined this rail rather than it shipping in the catalogue.",
            },
            createdByUserId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Null for catalogue rails. The author of a custom rail.",
            },
            listed: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            available: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            popularityRank: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            processingTime: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
                comment: "Default clearing time, which an account may override.",
            },
            fees: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "p2pPaymentRail",
            tableName: "p2p_payment_rails",
            timestamps: true,
            paranoid: true,
            indexes: [
                { name: "p2p_payment_rails_slug_unique", unique: true, fields: ["slug"] },
                { name: "p2p_payment_rails_listed", fields: ["listed", "available"] },
            ],
        });
    }
    static associate(models) {
        p2pPaymentRail.hasMany(models.p2pPaymentMethod, {
            as: "accounts",
            foreignKey: "railId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        p2pPaymentRail.belongsTo(models.user, {
            as: "author",
            foreignKey: "createdByUserId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = p2pPaymentRail;
