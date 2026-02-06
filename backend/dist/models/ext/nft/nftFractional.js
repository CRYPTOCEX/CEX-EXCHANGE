"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class nftFractional extends sequelize_1.Model {
    static initModel(sequelize) {
        return nftFractional.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            tokenId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                unique: true,
                validate: {
                    notNull: { msg: "tokenId: Token ID is required" },
                    isUUID: { args: 4, msg: "tokenId: Must be a valid UUID" },
                },
            },
            vaultAddress: {
                type: sequelize_1.DataTypes.STRING(42),
                allowNull: true,
                validate: {
                    is: {
                        args: /^0x[a-fA-F0-9]{40}$/,
                        msg: "vaultAddress: Must be a valid Ethereum address",
                    },
                },
            },
            totalShares: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    notNull: { msg: "totalShares: Total shares is required" },
                    min: { args: [100], msg: "totalShares: Minimum 100 shares" },
                    max: { args: [1000000], msg: "totalShares: Maximum 1M shares" },
                },
            },
            availableShares: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: { args: [0], msg: "availableShares: Cannot be negative" },
                },
            },
            sharePrice: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                validate: {
                    notNull: { msg: "sharePrice: Share price is required" },
                    isDecimal: { msg: "sharePrice: Must be a valid decimal" },
                    min: { args: [0.000001], msg: "sharePrice: Must be greater than 0" },
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                defaultValue: "ETH",
                validate: {
                    isIn: {
                        args: [["ETH", "USDC", "USDT", "DAI", "MATIC", "BNB"]],
                        msg: "currency: Invalid currency",
                    },
                },
            },
            minPurchase: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
                validate: {
                    min: { args: [1], msg: "minPurchase: Minimum is 1 share" },
                },
            },
            maxPurchase: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1000,
                validate: {
                    min: { args: [1], msg: "maxPurchase: Minimum is 1 share" },
                },
            },
            buyoutPrice: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                validate: {
                    isDecimal: { msg: "buyoutPrice: Must be a valid decimal" },
                    min: { args: [0], msg: "buyoutPrice: Cannot be negative" },
                },
            },
            buyoutEnabled: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            votingEnabled: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "ACTIVE", "BUYOUT_PENDING", "BOUGHT_OUT", "CANCELLED"),
                allowNull: false,
                defaultValue: "PENDING",
            },
            createdById: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "createdById: Creator ID is required" },
                    isUUID: { args: 4, msg: "createdById: Must be a valid UUID" },
                },
            },
            deployedAt: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: true,
            },
            buyoutAt: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: true,
            },
            metadata: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("metadata");
                    return value ? JSON.parse(value) : null;
                },
                set(value) {
                    this.setDataValue("metadata", value ? JSON.stringify(value) : null);
                },
            },
        }, {
            sequelize,
            modelName: "nftFractional",
            tableName: "nft_fractional",
            timestamps: true,
            paranoid: false,
            indexes: [
                { name: "idx_nft_fractional_token", fields: ["tokenId"], unique: true },
                { name: "idx_nft_fractional_status", fields: ["status"] },
                { name: "idx_nft_fractional_creator", fields: ["createdById"] },
                { name: "idx_nft_fractional_vault", fields: ["vaultAddress"] },
            ],
        });
    }
    static associate(models) {
        nftFractional.belongsTo(models.nftToken, {
            as: "token",
            foreignKey: "tokenId",
        });
        nftFractional.belongsTo(models.user, {
            as: "creator",
            foreignKey: "createdById",
        });
    }
}
exports.default = nftFractional;
