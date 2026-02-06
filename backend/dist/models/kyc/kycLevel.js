"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const redis_1 = require("@b/utils/redis");
const console_1 = require("@b/utils/console");
class kycLevel extends sequelize_1.Model {
    static initModel(sequelize) {
        return kycLevel.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: "Unique identifier for the KYC verification level",
            },
            serviceId: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
                comment: "ID of the external verification service used for this level",
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name cannot be empty" },
                },
                comment: "Name of the KYC level (e.g., 'Basic', 'Intermediate', 'Advanced')",
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Detailed description of the KYC level requirements",
            },
            level: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    isInt: { msg: "level: Level must be an integer" },
                },
                comment: "Numeric level indicating the verification tier (1, 2, 3, etc.)",
            },
            fields: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "Required fields and documents for this KYC level",
            },
            features: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "Features and benefits unlocked at this KYC level",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "DRAFT", "INACTIVE"),
                allowNull: false,
                defaultValue: "ACTIVE",
                validate: {
                    isIn: {
                        args: [["ACTIVE", "DRAFT", "INACTIVE"]],
                        msg: "status: Status must be either ACTIVE, DRAFT, or INACTIVE",
                    },
                },
                comment: "Current status of this KYC level configuration",
            },
        }, {
            sequelize,
            modelName: "kycLevel",
            tableName: "kyc_level",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
            ],
            hooks: {
                afterUpdate: async (instance) => {
                    try {
                        const redis = redis_1.RedisSingleton.getInstance();
                        const applications = await sequelize.models.kycApplication.findAll({
                            where: {
                                levelId: instance.id,
                                status: 'APPROVED'
                            },
                            attributes: ['userId']
                        });
                        for (const app of applications) {
                            const appData = app.get({ plain: true });
                            await redis.del(`user:${appData.userId}:profile`);
                        }
                    }
                    catch (error) {
                        console_1.logger.error("KYC", "Error clearing user caches after KYC level update", error);
                    }
                },
                afterBulkUpdate: async (options) => {
                    try {
                        const redis = redis_1.RedisSingleton.getInstance();
                        const levels = await kycLevel.findAll({
                            where: options.where,
                            attributes: ['id']
                        });
                        for (const level of levels) {
                            const applications = await sequelize.models.kycApplication.findAll({
                                where: {
                                    levelId: level.id,
                                    status: 'APPROVED'
                                },
                                attributes: ['userId']
                            });
                            for (const app of applications) {
                                const appData = app.get({ plain: true });
                                await redis.del(`user:${appData.userId}:profile`);
                            }
                        }
                    }
                    catch (error) {
                        console_1.logger.error("KYC", "Error clearing user caches after bulk KYC level update", error);
                    }
                }
            }
        });
    }
    static associate(models) {
        kycLevel.hasMany(models.kycApplication, {
            as: "applications",
            foreignKey: "levelId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        kycLevel.belongsTo(models.kycVerificationService, {
            as: "verificationService",
            foreignKey: "serviceId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = kycLevel;
