import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import validator from "validator";

export interface icoTeamMemberAttributes {
  id: string;
  offeringId: string;
  name: string;
  role: string;
  bio: string;
  avatar?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
  github?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface icoTeamMemberCreationAttributes
  extends Partial<icoTeamMemberAttributes> {}

export default class icoTeamMember
  extends Model<icoTeamMemberAttributes, icoTeamMemberCreationAttributes>
  implements icoTeamMemberAttributes
{
  id!: string;
  offeringId!: string;
  name!: string;
  role!: string;
  bio!: string;
  avatar?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
  github?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof icoTeamMember {
    return icoTeamMember.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        offeringId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "offeringId: Offering ID cannot be null" },
            isUUID: {
              args: 4,
              msg: "offeringId: Offering ID must be a valid UUID",
            },
          },
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
        },
        role: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: { msg: "role: Role must not be empty" },
          },
        },
        bio: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "bio: Bio must not be empty" },
          },
        },
        avatar: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        linkedin: {
          type: DataTypes.STRING(191),
          allowNull: true,
          validate: {
            customIsUrl(value: string) {
              // Allow empty values
              if (!value) return;
              if (!validator.isURL(value, { require_tld: false })) {
                throw new Error("linkedin: Must be a valid URL");
              }
            },
          },
        },
        twitter: {
          type: DataTypes.STRING(191),
          allowNull: true,
          validate: {
            customIsUrl(value: string) {
              // Allow empty values
              if (!value) return;
              if (!validator.isURL(value, { require_tld: false })) {
                throw new Error("twitter: Must be a valid URL");
              }
            },
          },
        },
        website: {
          type: DataTypes.STRING(191),
          allowNull: true,
          validate: {
            customIsUrl(value: string) {
              // Allow empty values
              if (!value) return;
              if (!validator.isURL(value, { require_tld: false })) {
                throw new Error("website: Must be a valid URL");
              }
            },
          },
        },
        github: {
          type: DataTypes.STRING(191),
          allowNull: true,
          validate: {
            customIsUrl(value: string) {
              // Allow empty values
              if (!value) return;
              if (!validator.isURL(value, { require_tld: false })) {
                throw new Error("github: Must be a valid URL");
              }
            },
          },
        },
      },
      {
        sequelize,
        modelName: "icoTeamMember",
        tableName: "ico_team_member",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    icoTeamMember.belongsTo(models.icoTokenOffering, {
      as: "offering",
      foreignKey: "offeringId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
