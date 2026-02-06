"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class nftFavorite extends sequelize_1.Model {
    static initModel(sequelize) {
        return nftFavorite.init({
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
            tokenId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "tokenId: Token ID must be a valid UUID" },
                },
            },
            collectionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "collectionId: Collection ID must be a valid UUID" },
                },
            },
        }, {
            sequelize,
            modelName: "nftFavorite",
            tableName: "nft_favorite",
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
                    name: "nftFavoriteUserTokenKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "tokenId" }],
                },
                {
                    name: "nftFavoriteUserCollectionKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "collectionId" }],
                },
                {
                    name: "nftFavoriteUserIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "nftFavoriteTokenIdx",
                    using: "BTREE",
                    fields: [{ name: "tokenId" }],
                },
                {
                    name: "nftFavoriteCollectionIdx",
                    using: "BTREE",
                    fields: [{ name: "collectionId" }],
                },
            ],
            validate: {
                eitherTokenOrCollection() {
                    if (!this.tokenId && !this.collectionId) {
                        throw new Error("Either tokenId or collectionId must be provided");
                    }
                    if (this.tokenId && this.collectionId) {
                        throw new Error("Cannot favorite both token and collection simultaneously");
                    }
                },
            },
        });
    }
    static associate(models) {
        nftFavorite.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftFavorite.belongsTo(models.nftToken, {
            as: "token",
            foreignKey: "tokenId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftFavorite.belongsTo(models.nftCollection, {
            as: "collection",
            foreignKey: "collectionId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = nftFavorite;
