"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class icoTokenOfferingUpdate extends sequelize_1.Model {
    static initModel(sequelize) {
        return icoTokenOfferingUpdate.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            offeringId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "offeringId: Offering ID cannot be null" },
                    isUUID: { args: 4, msg: "offeringId: Must be a valid UUID" },
                },
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "userId: User ID cannot be null" },
                    isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
                },
            },
            title: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "title: Title must not be empty" },
                },
            },
            content: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "content: Content must not be empty" },
                },
            },
            attachments: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "icoTokenOfferingUpdate",
            tableName: "ico_token_offering_update",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "icoTokenOfferingUpdateOfferingIdIdx",
                    fields: [{ name: "offeringId" }],
                },
                {
                    name: "icoTokenOfferingUpdateUserIdIdx",
                    fields: [{ name: "userId" }],
                },
            ],
        });
    }
    static associate(models) {
        icoTokenOfferingUpdate.belongsTo(models.icoTokenOffering, {
            foreignKey: "offeringId",
            as: "offering",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        icoTokenOfferingUpdate.belongsTo(models.user, {
            foreignKey: "userId",
            as: "user",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = icoTokenOfferingUpdate;
