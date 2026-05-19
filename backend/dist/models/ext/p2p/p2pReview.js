"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class p2pReview extends sequelize_1.Model {
    static initModel(sequelize) {
        return p2pReview.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            reviewerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "reviewerId cannot be null" },
                    isUUID: { args: 4, msg: "reviewerId must be a valid UUID" },
                },
            },
            revieweeId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "revieweeId cannot be null" },
                    isUUID: { args: 4, msg: "revieweeId must be a valid UUID" },
                },
            },
            tradeId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "tradeId must be a valid UUID" },
                },
            },
            communicationRating: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                validate: {
                    isFloat: { msg: "communicationRating must be a number" },
                    min: { args: [0], msg: "communicationRating cannot be negative" },
                    max: { args: [100], msg: "communicationRating cannot exceed 100" },
                },
            },
            speedRating: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                validate: {
                    isFloat: { msg: "speedRating must be a number" },
                    min: { args: [0], msg: "speedRating cannot be negative" },
                    max: { args: [100], msg: "speedRating cannot exceed 100" },
                },
            },
            trustRating: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                validate: {
                    isFloat: { msg: "trustRating must be a number" },
                    min: { args: [0], msg: "trustRating cannot be negative" },
                    max: { args: [100], msg: "trustRating cannot exceed 100" },
                },
            },
            comment: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "p2pReview",
            tableName: "p2p_reviews",
            timestamps: true,
            paranoid: true,
        });
    }
    static associate(models) {
        p2pReview.belongsTo(models.user, {
            as: "reviewer",
            foreignKey: "reviewerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pReview.belongsTo(models.user, {
            as: "reviewee",
            foreignKey: "revieweeId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pReview.belongsTo(models.p2pTrade, {
            as: "trade",
            foreignKey: "tradeId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = p2pReview;
