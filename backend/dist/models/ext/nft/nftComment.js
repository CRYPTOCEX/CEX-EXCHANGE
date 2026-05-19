"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class nftComment extends sequelize_1.Model {
    static initModel(sequelize) {
        return nftComment.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            tokenId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "tokenId: Must be a valid UUID" },
                },
            },
            collectionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "collectionId: Must be a valid UUID" },
                },
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "userId: User ID is required" },
                    isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
                },
            },
            parentId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "parentId: Must be a valid UUID" },
                },
            },
            content: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "content: Comment cannot be empty" },
                    len: { args: [1, 5000], msg: "content: Comment must be between 1 and 5000 characters" },
                },
            },
            likes: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: { args: [0], msg: "likes: Cannot be negative" },
                },
            },
            isEdited: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            isDeleted: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
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
            modelName: "nftComment",
            tableName: "nft_comment",
            timestamps: true,
            paranoid: false,
            indexes: [
                { name: "idx_nft_comment_token", fields: ["tokenId"] },
                { name: "idx_nft_comment_collection", fields: ["collectionId"] },
                { name: "idx_nft_comment_user", fields: ["userId"] },
                { name: "idx_nft_comment_parent", fields: ["parentId"] },
                { name: "idx_nft_comment_created", fields: ["createdAt"] },
            ],
        });
    }
    static associate(models) {
        nftComment.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
        });
        nftComment.belongsTo(models.nftToken, {
            as: "token",
            foreignKey: "tokenId",
        });
        nftComment.belongsTo(models.nftCollection, {
            as: "collection",
            foreignKey: "collectionId",
        });
        nftComment.belongsTo(models.nftComment, {
            as: "parent",
            foreignKey: "parentId",
        });
        nftComment.hasMany(models.nftComment, {
            as: "replies",
            foreignKey: "parentId",
        });
    }
}
exports.default = nftComment;
