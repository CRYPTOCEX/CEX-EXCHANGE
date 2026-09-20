import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class nftCreator
  extends Model<nftCreatorAttributes, nftCreatorCreationAttributes>
  implements nftCreatorAttributes
{
  id!: string;
  userId!: string;
  displayName?: string;
  bio?: string;
  banner?: string;
  isVerified!: boolean;
  verificationTier?: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  totalSales?: number;
  totalVolume?: number;
  totalItems?: number;
  floorPrice?: number;
  profilePublic?: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftCreator {
    return nftCreator.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
          },
        },
        displayName: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            len: { args: [1, 255], msg: "displayName: Display name must be between 1 and 255 characters" },
          },
        },
        bio: {
          type: DataTypes.TEXT,
          allowNull: true,
          validate: {
            len: { args: [0, 1000], msg: "bio: Bio must not exceed 1000 characters" },
          },
        },
        banner: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          validate: {
            is: {
              args: ["^/(uploads|img)/.*$", "i"],
              msg: "banner: Banner must be a valid URL",
            },
          },
        },
        isVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        verificationTier: {
          type: DataTypes.ENUM("BRONZE", "SILVER", "GOLD", "PLATINUM"),
          allowNull: true,
          validate: {
            isIn: {
              args: [["BRONZE", "SILVER", "GOLD", "PLATINUM"]],
              msg: "verificationTier: Verification tier must be one of 'BRONZE', 'SILVER', 'GOLD', or 'PLATINUM'",
            },
          },
        },
        totalSales: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "totalSales: Total sales must be non-negative" },
          },
        },
        totalVolume: {
          type: DataTypes.DECIMAL(36, 18),
          // mysql2 returns DECIMAL as a STRING. `*` and `/` coerce, but `+`
          // CONCATENATES and `<`/`>` compare LEXICOGRAPHICALLY, so every
          // total and every threshold check silently used string semantics.
          // Hand back a number so the arithmetic means what it reads as.
          get(this: any) {
            const value = this.getDataValue("totalVolume");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "totalVolume: Total volume must be non-negative" },
          },
        },
        totalItems: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "totalItems: Total items must be non-negative" },
          },
        },
        floorPrice: {
          type: DataTypes.DECIMAL(36, 18),
          // mysql2 returns DECIMAL as a STRING. `*` and `/` coerce, but `+`
          // CONCATENATES and `<`/`>` compare LEXICOGRAPHICALLY, so every
          // total and every threshold check silently used string semantics.
          // Hand back a number so the arithmetic means what it reads as.
          get(this: any) {
            const value = this.getDataValue("floorPrice");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: true,
          validate: {
            min: { args: [0], msg: "floorPrice: Floor price must be non-negative" },
          },
        },
        profilePublic: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: "nftCreator",
        tableName: "nft_creator",
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
            name: "nftCreatorUserKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "nftCreatorVerifiedIdx",
            using: "BTREE",
            fields: [{ name: "isVerified" }],
          },
          {
            name: "nftCreatorTierIdx",
            using: "BTREE",
            fields: [{ name: "verificationTier" }],
          },
          {
            name: "nftCreatorVolumeIdx",
            using: "BTREE",
            fields: [{ name: "totalVolume" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    nftCreator.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftCreator.hasMany(models.nftCollection, {
      as: "collections",
      foreignKey: "creatorId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftCreator.hasMany(models.nftToken, {
      as: "tokens",
      foreignKey: "creatorId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
} 