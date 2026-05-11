"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ecommerceOrder extends sequelize_1.Model {
    get orderItems() { return this.ecommerceOrderItems; }
    static initModel(sequelize) {
        return ecommerceOrder.init({
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
                    isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "COMPLETED", "CANCELLED", "REJECTED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [["PENDING", "COMPLETED", "CANCELLED", "REJECTED"]],
                        msg: "status: Must be 'PENDING', 'COMPLETED', 'CANCELLED', or 'REJECTED'",
                    },
                },
            },
            shippingId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            subtotal: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
            },
            discount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                defaultValue: 0,
            },
            shippingCost: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                defaultValue: 0,
            },
            tax: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                defaultValue: 0,
            },
            total: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            walletType: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "ecommerceOrder",
            tableName: "ecommerce_order",
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
                    name: "ecommerceOrderIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "ecommerceOrderUserIdFkey",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "ecommerceOrderShippingIdFkey",
                    using: "BTREE",
                    fields: [{ name: "shippingId" }],
                },
            ],
        });
    }
    static associate(models) {
        ecommerceOrder.hasMany(models.ecommerceOrderItem, {
            as: "ecommerceOrderItems",
            foreignKey: "orderId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceOrder.belongsToMany(models.ecommerceProduct, {
            as: "products",
            through: models.ecommerceOrderItem,
            foreignKey: "orderId",
            otherKey: "productId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceOrder.belongsTo(models.ecommerceShipping, {
            as: "shipping",
            foreignKey: "shippingId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceOrder.hasOne(models.ecommerceShippingAddress, {
            as: "shippingAddress",
            foreignKey: "orderId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceOrder.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = ecommerceOrder;
