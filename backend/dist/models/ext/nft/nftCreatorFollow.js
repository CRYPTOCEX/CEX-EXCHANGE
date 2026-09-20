"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class NftCreatorFollow extends sequelize_1.Model {
    static initModel(sequelize) {
        return NftCreatorFollow.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            followerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
            followingId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
        }, {
            sequelize,
            modelName: "nftCreatorFollow",
            tableName: "nft_creator_follows",
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ["followerId", "followingId"],
                    name: "unique_creator_follow",
                },
                {
                    fields: ["followerId"],
                    name: "idx_creator_follow_follower",
                },
                {
                    fields: ["followingId"],
                    name: "idx_creator_follow_following",
                },
                {
                    fields: ["createdAt"],
                    name: "idx_creator_follow_created",
                },
            ],
        });
    }
    static associate(models) {
        NftCreatorFollow.belongsTo(models.user, {
            as: "follower",
            foreignKey: "followerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        NftCreatorFollow.belongsTo(models.user, {
            as: "following",
            foreignKey: "followingId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = NftCreatorFollow;
