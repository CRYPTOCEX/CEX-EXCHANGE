"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ecommerceUserDiscount extends sequelize_1.Model {
    static initModel(sequelize) {
        return ecommerceUserDiscount.init({
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
                    isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
                },
            },
            discountId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "discountId: Discount ID cannot be null" },
                    isUUID: {
                        args: 4,
                        msg: "discountId: Discount ID must be a valid UUID",
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
            modelName: "ecommerceUserDiscount",
            tableName: "ecommerce_user_discount",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "ecommerceUserDiscountUserIdDiscountIdUnique",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "discountId" }],
                },
                {
                    name: "ecommerceUserDiscountDiscountIdFkey",
                    using: "BTREE",
                    fields: [{ name: "discountId" }],
                },
            ],
        });
    }
    static associate(models) {
        ecommerceUserDiscount.belongsTo(models.ecommerceDiscount, {
            as: "discount",
            foreignKey: "discountId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceUserDiscount.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = ecommerceUserDiscount;
