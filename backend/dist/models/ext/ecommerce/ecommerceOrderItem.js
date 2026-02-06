"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ecommerceOrderItem extends sequelize_1.Model {
    static initModel(sequelize) {
        return ecommerceOrderItem.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            orderId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: { args: 4, msg: "orderId: Order ID must be a valid UUID" },
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
            quantity: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    isInt: { msg: "quantity: Quantity must be an integer" },
                    min: { args: [1], msg: "quantity: Quantity must be at least 1" },
                },
            },
            key: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            filePath: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            instructions: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "ecommerceOrderItem",
            tableName: "ecommerce_order_item",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "ecommerceOrderItemOrderIdProductIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "orderId" }, { name: "productId" }],
                },
                {
                    name: "ecommerceOrderItemProductIdFkey",
                    using: "BTREE",
                    fields: [{ name: "productId" }],
                },
            ],
        });
    }
    static associate(models) {
        ecommerceOrderItem.belongsTo(models.ecommerceProduct, {
            as: "product",
            foreignKey: "productId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceOrderItem.belongsTo(models.ecommerceOrder, {
            as: "order",
            foreignKey: "orderId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = ecommerceOrderItem;
