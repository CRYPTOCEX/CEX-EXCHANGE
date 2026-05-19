import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export interface NftCreatorFollowAttributes {
  id: string;
  followerId: string;
  followingId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type NftCreatorFollowCreationAttributes = Sequelize.Optional<
  NftCreatorFollowAttributes,
  "id" | "createdAt" | "updatedAt"
>;

export default class NftCreatorFollow
  extends Model<NftCreatorFollowAttributes, NftCreatorFollowCreationAttributes>
  implements NftCreatorFollowAttributes
{
  public id!: string;
  public followerId!: string;
  public followingId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof NftCreatorFollow {
    return NftCreatorFollow.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        followerId: {
          type: DataTypes.UUID,
          allowNull: false,
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        followingId: {
          type: DataTypes.UUID,
          allowNull: false,
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
      },
      {
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
      }
    );
  }

  public static associate(models: any) {
    // Follower relationship
    NftCreatorFollow.belongsTo(models.user, {
      as: "follower",
      foreignKey: "followerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Following relationship
    NftCreatorFollow.belongsTo(models.user, {
      as: "following",
      foreignKey: "followingId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
} 