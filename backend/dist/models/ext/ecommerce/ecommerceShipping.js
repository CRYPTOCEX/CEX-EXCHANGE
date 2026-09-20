"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ecommerceShipping extends sequelize_1.Model {
    static initModel(sequelize) {
        return ecommerceShipping.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            loadId: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "loadId: Load ID must not be empty" },
                },
            },
            loadStatus: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "TRANSIT", "DELIVERED", "CANCELLED"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["PENDING", "TRANSIT", "DELIVERED", "CANCELLED"]],
                        msg: "loadStatus: Must be one of PENDING, TRANSIT, DELIVERED, CANCELLED",
                    },
                },
            },
            shipper: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "shipper: Shipper must not be empty" },
                },
            },
            transporter: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "transporter: Transporter must not be empty" },
                },
            },
            goodsType: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "goodsType: Goods type must not be empty" },
                },
            },
            weight: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                validate: {
                    isNumeric: { msg: "weight: Must be a numeric value" },
                },
            },
            volume: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                validate: {
                    isNumeric: { msg: "volume: Must be a numeric value" },
                },
            },
            description: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "description: Description must not be empty" },
                },
            },
            vehicle: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "vehicle: Vehicle must not be empty" },
                },
            },
            cost: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: true,
                validate: {
                    isNumeric: { msg: "cost: Must be a numeric value" },
                },
            },
            tax: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: true,
                validate: {
                    isNumeric: { msg: "tax: Must be a numeric value" },
                },
            },
            deliveryDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "ecommerceShipping",
            tableName: "ecommerce_shipping",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
            ],
        });
    }
    static associate(models) {
        ecommerceShipping.hasMany(models.ecommerceOrder, {
            as: "ecommerceOrders",
            foreignKey: "shippingId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceShipping.belongsToMany(models.ecommerceProduct, {
            as: "products",
            through: models.ecommerceOrder,
            foreignKey: "shippingId",
            otherKey: "productId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = ecommerceShipping;
