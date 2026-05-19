"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class icoTokenDetail extends sequelize_1.Model {
    static initModel(sequelize) {
        return icoTokenDetail.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
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
            tokenType: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "tokenType: Token type must not be empty" },
                },
            },
            totalSupply: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                validate: {
                    isFloat: { msg: "totalSupply: Must be a valid number" },
                    min: { args: [0], msg: "totalSupply: Cannot be negative" },
                },
            },
            tokensForSale: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                validate: {
                    isFloat: { msg: "tokensForSale: Must be a valid number" },
                    min: { args: [0], msg: "tokensForSale: Cannot be negative" },
                },
            },
            salePercentage: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: false,
                validate: {
                    isFloat: { msg: "salePercentage: Must be a valid number" },
                    min: { args: [0], msg: "salePercentage: Cannot be negative" },
                    max: { args: [100], msg: "salePercentage: Cannot exceed 100" },
                },
            },
            blockchain: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "blockchain: Blockchain must not be empty" },
                },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "description: Description must not be empty" },
                },
            },
            useOfFunds: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
            },
            links: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
            },
        }, {
            sequelize,
            modelName: "icoTokenDetail",
            tableName: "ico_token_detail",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "icoTokenDetailOfferingIdKey",
                    unique: true,
                    fields: [{ name: "offeringId" }],
                },
            ],
        });
    }
    static associate(models) {
        icoTokenDetail.belongsTo(models.icoTokenOffering, {
            as: "offering",
            foreignKey: "offeringId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        icoTokenDetail.belongsTo(models.icoTokenType, {
            as: "tokenTypeData",
            foreignKey: "tokenType",
            targetKey: "id",
            constraints: false,
        });
    }
}
exports.default = icoTokenDetail;
