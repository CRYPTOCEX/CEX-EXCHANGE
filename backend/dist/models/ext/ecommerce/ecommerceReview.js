"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ecommerceReview extends sequelize_1.Model {
    static initModel(sequelize) {
        return ecommerceReview.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            productId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "productId: Product ID cannot be null" },
                    isUUID: {
                        args: 4,
                        msg: "productId: Product ID must be a valid UUID",
                    },
                },
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "userId: User ID cannot be null" },
                    isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
                },
            },
            rating: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    isInt: { msg: "rating: Rating must be an integer" },
                    min: { args: [1], msg: "rating: Rating must be at least 1" },
                    max: { args: [5], msg: "rating: Rating must be no more than 5" },
                },
            },
            comment: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 191],
                        msg: "comment: Comment cannot exceed 191 characters",
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
            modelName: "ecommerceReview",
            tableName: "ecommerce_review",
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
                    name: "ecommerceReviewProductIdUserIdUnique",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "productId" }, { name: "userId" }],
                },
                {
                    name: "ecommerceReviewUserIdFkey",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
            ],
        });
    }
    static associate(models) {
        ecommerceReview.belongsTo(models.ecommerceProduct, {
            as: "product",
            foreignKey: "productId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceReview.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = ecommerceReview;
