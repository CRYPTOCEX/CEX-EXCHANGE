"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class icoTransaction extends sequelize_1.Model {
    static initModel(sequelize) {
        return icoTransaction.init({
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
            offeringId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "offeringId: Offering ID cannot be null" },
                    isUUID: {
                        args: 4,
                        msg: "offeringId: Offering ID must be a valid UUID",
                    },
                },
            },
            amount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isFloat: { msg: "amount: Must be a valid number" },
                    min: { args: [0], msg: "amount: Cannot be negative" },
                },
            },
            price: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isFloat: { msg: "price: Must be a valid number" },
                    min: { args: [0], msg: "price: Cannot be negative" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "VERIFICATION", "RELEASED", "REJECTED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [["PENDING", "VERIFICATION", "RELEASED", "REJECTED"]],
                        msg: "status: Must be 'PENDING', 'VERIFICATION', 'RELEASED' or 'REJECTED'",
                    },
                },
            },
            releaseUrl: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            walletAddress: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            notes: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "icoTransaction",
            tableName: "ico_transaction",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "icoTransactionOfferingIdUserIdKey",
                    fields: [{ name: "offeringId" }, { name: "userId" }],
                },
            ],
        });
    }
    static associate(models) {
        icoTransaction.belongsTo(models.icoTokenOffering, {
            as: "offering",
            foreignKey: "offeringId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        icoTransaction.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = icoTransaction;
