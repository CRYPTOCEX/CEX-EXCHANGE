"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const validator_1 = __importDefault(require("validator"));
class icoTeamMember extends sequelize_1.Model {
    static initModel(sequelize) {
        return icoTeamMember.init({
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
                    isUUID: {
                        args: 4,
                        msg: "offeringId: Offering ID must be a valid UUID",
                    },
                },
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name must not be empty" },
                },
            },
            role: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "role: Role must not be empty" },
                },
            },
            bio: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "bio: Bio must not be empty" },
                },
            },
            avatar: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            linkedin: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                validate: {
                    customIsUrl(value) {
                        if (!value)
                            return;
                        if (!validator_1.default.isURL(value, { require_tld: false })) {
                            throw new Error("linkedin: Must be a valid URL");
                        }
                    },
                },
            },
            twitter: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                validate: {
                    customIsUrl(value) {
                        if (!value)
                            return;
                        if (!validator_1.default.isURL(value, { require_tld: false })) {
                            throw new Error("twitter: Must be a valid URL");
                        }
                    },
                },
            },
            website: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                validate: {
                    customIsUrl(value) {
                        if (!value)
                            return;
                        if (!validator_1.default.isURL(value, { require_tld: false })) {
                            throw new Error("website: Must be a valid URL");
                        }
                    },
                },
            },
            github: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                validate: {
                    customIsUrl(value) {
                        if (!value)
                            return;
                        if (!validator_1.default.isURL(value, { require_tld: false })) {
                            throw new Error("github: Must be a valid URL");
                        }
                    },
                },
            },
        }, {
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
                {
                    name: "icoTeamMemberOfferingIdIdx",
                    fields: [{ name: "offeringId" }],
                },
            ],
        });
    }
    static associate(models) {
        icoTeamMember.belongsTo(models.icoTokenOffering, {
            as: "offering",
            foreignKey: "offeringId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = icoTeamMember;
