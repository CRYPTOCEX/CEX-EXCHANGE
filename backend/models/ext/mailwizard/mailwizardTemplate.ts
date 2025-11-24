import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import mailwizardCampaign from "./mailwizardCampaign";

export default class mailwizardTemplate
  extends Model<
    mailwizardTemplateAttributes,
    mailwizardTemplateCreationAttributes
  >
  implements mailwizardTemplateAttributes
{
  id!: string;
  name!: string;
  content!: string;
  design!: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // mailwizardTemplate hasMany mailwizardCampaign via templateId
  mailwizardCampaigns!: mailwizardCampaign[];
  getMailwizardCampaigns!: Sequelize.HasManyGetAssociationsMixin<mailwizardCampaign>;
  setMailwizardCampaigns!: Sequelize.HasManySetAssociationsMixin<
    mailwizardCampaign,
    mailwizardCampaignId
  >;
  addMailwizardCampaign!: Sequelize.HasManyAddAssociationMixin<
    mailwizardCampaign,
    mailwizardCampaignId
  >;
  addMailwizardCampaigns!: Sequelize.HasManyAddAssociationsMixin<
    mailwizardCampaign,
    mailwizardCampaignId
  >;
  createMailwizardCampaign!: Sequelize.HasManyCreateAssociationMixin<mailwizardCampaign>;
  removeMailwizardCampaign!: Sequelize.HasManyRemoveAssociationMixin<
    mailwizardCampaign,
    mailwizardCampaignId
  >;
  removeMailwizardCampaigns!: Sequelize.HasManyRemoveAssociationsMixin<
    mailwizardCampaign,
    mailwizardCampaignId
  >;
  hasMailwizardCampaign!: Sequelize.HasManyHasAssociationMixin<
    mailwizardCampaign,
    mailwizardCampaignId
  >;
  hasMailwizardCampaigns!: Sequelize.HasManyHasAssociationsMixin<
    mailwizardCampaign,
    mailwizardCampaignId
  >;
  countMailwizardCampaigns!: Sequelize.HasManyCountAssociationsMixin;

  public static initModel(sequelize: Sequelize.Sequelize): typeof mailwizardTemplate {
    return mailwizardTemplate.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name cannot be empty" },
          },
        },
        content: {
          type: DataTypes.TEXT("long"),
          allowNull: false,
          validate: {
            notEmpty: { msg: "content: Content cannot be empty" },
          },
        },
        design: {
          type: DataTypes.TEXT("long"),
          allowNull: false,
          validate: {
            notEmpty: { msg: "design: Design description cannot be empty" },
          },
        },
      },
      {
        sequelize,
        modelName: "mailwizardTemplate",
        tableName: "mailwizard_template",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    mailwizardTemplate.hasMany(models.mailwizardCampaign, {
      as: "mailwizardCampaigns",
      foreignKey: "templateId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
