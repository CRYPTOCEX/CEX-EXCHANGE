"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class icoTokenVestingRelease extends sequelize_1.Model {
    static initModel(sequelize) {
        return icoTokenVestingRelease.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            vestingId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "ico_token_vesting",
                    key: "id",
                },
                onDelete: "CASCADE",
                comment: "Reference to the parent vesting record",
            },
            releaseDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                comment: "Date when tokens should be released",
            },
            releaseAmount: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                validate: {
                    min: 0,
                },
                comment: "Amount of tokens to release",
            },
            percentage: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: false,
                validate: {
                    min: 0,
                    max: 100,
                },
                comment: "Percentage of total vesting amount",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "RELEASED", "FAILED", "CANCELLED"),
                allowNull: false,
                defaultValue: "PENDING",
                comment: "Current status of this release",
            },
            transactionHash: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "Blockchain transaction hash if released on-chain",
            },
            releasedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "Actual date when tokens were released",
            },
            failureReason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Reason for failure if status is FAILED",
            },
            metadata: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "Additional metadata about the release",
            },
        }, {
            sequelize,
            modelName: "icoTokenVestingRelease",
            tableName: "ico_token_vesting_release",
            timestamps: true,
            paranoid: true,
            indexes: [
                { fields: ["vestingId"] },
                { fields: ["releaseDate"] },
                { fields: ["status"] },
                { fields: ["vestingId", "status"] },
                { fields: ["releaseDate", "status"] },
            ],
        });
    }
    static associate(models) {
        icoTokenVestingRelease.belongsTo(models.icoTokenVesting, {
            as: "vesting",
            foreignKey: "vestingId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = icoTokenVestingRelease;
