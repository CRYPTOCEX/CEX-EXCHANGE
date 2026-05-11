"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class icoTokenVesting extends sequelize_1.Model {
    static initModel(sequelize) {
        return icoTokenVesting.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            transactionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "ico_transaction",
                    key: "id",
                },
                onDelete: "CASCADE",
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "user",
                    key: "id",
                },
                onDelete: "CASCADE",
            },
            offeringId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "ico_token_offering",
                    key: "id",
                },
                onDelete: "CASCADE",
            },
            totalAmount: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                validate: {
                    min: 0,
                },
            },
            releasedAmount: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: 0,
                },
            },
            vestingType: {
                type: sequelize_1.DataTypes.ENUM("LINEAR", "CLIFF", "MILESTONE"),
                allowNull: false,
                defaultValue: "LINEAR",
            },
            startDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            endDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            cliffDuration: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                comment: "Cliff duration in days",
            },
            releaseSchedule: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "JSON array of milestone releases [{date, percentage, amount}]",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "COMPLETED", "CANCELLED"),
                allowNull: false,
                defaultValue: "ACTIVE",
            },
        }, {
            sequelize,
            modelName: "icoTokenVesting",
            tableName: "ico_token_vesting",
            timestamps: true,
            paranoid: true,
            indexes: [
                { fields: ["transactionId"] },
                { fields: ["userId"] },
                { fields: ["offeringId"] },
                { fields: ["status"] },
                { fields: ["startDate", "endDate"] },
            ],
        });
    }
    static associate(models) {
        icoTokenVesting.hasMany(models.icoTokenVestingRelease, {
            as: "releases",
            foreignKey: "vestingId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        icoTokenVesting.belongsTo(models.icoTransaction, {
            as: "transaction",
            foreignKey: "transactionId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        icoTokenVesting.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        icoTokenVesting.belongsTo(models.icoTokenOffering, {
            as: "offering",
            foreignKey: "offeringId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = icoTokenVesting;
