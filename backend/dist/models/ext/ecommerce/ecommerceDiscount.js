"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ecommerceDiscount extends sequelize_1.Model {
    static initModel(sequelize) {
        return ecommerceDiscount.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            code: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                unique: "ecommerceDiscountCodeKey",
                validate: {
                    notEmpty: { msg: "code: Code must not be empty" },
                },
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("PERCENTAGE", "FIXED", "FREE_SHIPPING"),
                allowNull: false,
                defaultValue: "PERCENTAGE",
                validate: {
                    isIn: {
                        args: [["PERCENTAGE", "FIXED", "FREE_SHIPPING"]],
                        msg: "type: Must be 'PERCENTAGE', 'FIXED', or 'FREE_SHIPPING'",
                    },
                },
            },
            percentage: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 0,
                validate: {
                    isInt: { msg: "percentage: Percentage must be an integer" },
                    min: {
                        args: [0],
                        msg: "percentage: Percentage cannot be negative",
                    },
                    max: {
                        args: [100],
                        msg: "percentage: Percentage cannot be more than 100",
                    },
                },
            },
            amount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                defaultValue: 0,
                validate: {
                    isFloat: { msg: "amount: Amount must be a valid number" },
                    min: {
                        args: [0],
                        msg: "amount: Amount cannot be negative",
                    },
                },
            },
            maxUses: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    isInt: { msg: "maxUses: Max uses must be an integer" },
                    min: {
                        args: [1],
                        msg: "maxUses: Max uses must be at least 1",
                    },
                },
            },
            validFrom: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: true,
                validate: {
                    isDate: {
                        msg: "validFrom: Must be a valid date",
                        args: true,
                    },
                },
            },
            validUntil: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: false,
                validate: {
                    isDate: {
                        msg: "validUntil: Must be a valid date",
                        args: true,
                    },
                    isFutureDate(value) {
                        if (new Date(value) <= new Date()) {
                            throw new Error("validUntil: Date must be in the future");
                        }
                    },
                },
            },
            productId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: {
                        args: 4,
                        msg: "productId: Product ID must be a valid UUID",
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
        }, {
            sequelize,
            modelName: "ecommerceDiscount",
            tableName: "ecommerce_discount",
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
                    name: "ecommerceDiscountCodeKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "code" }],
                },
                {
                    name: "ecommerceDiscountProductIdFkey",
                    using: "BTREE",
                    fields: [{ name: "productId" }],
                },
            ],
        });
    }
    static associate(models) {
        ecommerceDiscount.belongsTo(models.ecommerceProduct, {
            as: "product",
            foreignKey: "productId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceDiscount.hasMany(models.ecommerceUserDiscount, {
            as: "ecommerceUserDiscounts",
            foreignKey: "discountId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = ecommerceDiscount;
