"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class mailwizardTemplate extends sequelize_1.Model {
    static initModel(sequelize) {
        return mailwizardTemplate.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name cannot be empty" },
                },
            },
            content: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "content: Content cannot be empty" },
                },
            },
            design: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "design: Design description cannot be empty" },
                },
            },
        }, {
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
        });
    }
    static associate(models) {
        mailwizardTemplate.hasMany(models.mailwizardCampaign, {
            as: "mailwizardCampaigns",
            foreignKey: "templateId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = mailwizardTemplate;
