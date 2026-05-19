"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class tag extends sequelize_1.Model {
    static initModel(sequelize) {
        return tag.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: "Unique identifier for the blog tag",
            },
            name: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name cannot be empty" },
                },
                comment: "Display name of the tag",
            },
            slug: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                unique: "tagSlugKey",
                validate: {
                    notEmpty: { msg: "slug: Slug cannot be empty" },
                },
                comment: "URL-friendly slug for the tag (used in URLs)",
            },
        }, {
            sequelize,
            modelName: "tag",
            tableName: "tag",
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
                    name: "tagSlugKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "slug" }],
                },
            ],
        });
    }
    static associate(models) {
        tag.hasMany(models.postTag, {
            as: "postTags",
            foreignKey: "tagId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        tag.belongsToMany(models.post, {
            through: models.postTag,
            as: "posts",
            foreignKey: "tagId",
            otherKey: "postId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = tag;
