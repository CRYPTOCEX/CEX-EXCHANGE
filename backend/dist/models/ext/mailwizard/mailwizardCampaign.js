"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class mailwizardCampaign extends sequelize_1.Model {
    static initModel(sequelize) {
        return mailwizardCampaign.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            templateId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: {
                        args: 4,
                        msg: "templateId: Template ID must be a valid UUID",
                    },
                },
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name cannot be empty" },
                },
            },
            subject: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "subject: Subject cannot be empty" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "PAUSED", "ACTIVE", "STOPPED", "COMPLETED", "CANCELLED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [
                            [
                                "PENDING",
                                "PAUSED",
                                "ACTIVE",
                                "STOPPED",
                                "COMPLETED",
                                "CANCELLED",
                            ],
                        ],
                        msg: "status: Status must be one of PENDING, PAUSED, ACTIVE, STOPPED, COMPLETED, CANCELLED",
                    },
                },
            },
            speed: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
                validate: {
                    isInt: { msg: "speed: Speed must be an integer" },
                },
            },
            targets: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "mailwizardCampaign",
            tableName: "mailwizard_campaign",
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
                    name: "mailwizardCampaignTemplateIdForeign",
                    using: "BTREE",
                    fields: [{ name: "templateId" }],
                },
            ],
        });
    }
    static associate(models) {
        mailwizardCampaign.belongsTo(models.mailwizardTemplate, {
            as: "template",
            foreignKey: "templateId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = mailwizardCampaign;
