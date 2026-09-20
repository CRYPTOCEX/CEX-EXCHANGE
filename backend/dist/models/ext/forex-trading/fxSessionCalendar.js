"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class fxSessionCalendar extends sequelize_1.Model {
    static initModel(sequelize) {
        return fxSessionCalendar.init({
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
                    notEmpty: { msg: "name: Name must not be empty" },
                },
                comment: "Calendar name (e.g. FX 24/5, US Stocks RTH, CME Metals)",
            },
            timezone: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                defaultValue: "America/New_York",
                validate: {
                    notEmpty: { msg: "timezone: Timezone must not be empty" },
                },
                comment: "IANA timezone the weekly schedule is expressed in",
            },
            weeklySchedule: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                validate: {
                    isValidSchedule(value) {
                        if (value === null || value === undefined)
                            return;
                        try {
                            const json = typeof value === "string" ? JSON.parse(value) : value;
                            if (!Array.isArray(json)) {
                                throw new Error("weeklySchedule must be a JSON array");
                            }
                            for (const w of json) {
                                if (typeof w.openDay !== "number" ||
                                    typeof w.openTime !== "string" ||
                                    typeof w.closeDay !== "number" ||
                                    typeof w.closeTime !== "string") {
                                    throw new Error("each window needs openDay, openTime, closeDay, closeTime");
                                }
                            }
                        }
                        catch (err) {
                            throw new Error("weeklySchedule: must be a valid JSON array of session windows: " +
                                err.message);
                        }
                    },
                },
                set(value) {
                    this.setDataValue("weeklySchedule", typeof value === "string" ? value : JSON.stringify(value));
                },
                get() {
                    const value = this.getDataValue("weeklySchedule");
                    return value ? JSON.parse(value) : null;
                },
                comment: "JSON array of session windows: [{openDay:0-6, openTime:'HH:mm', closeDay:0-6, closeTime:'HH:mm', break?:{start:'HH:mm', end:'HH:mm'}}] in `timezone` local time. Day 0 = Sunday.",
            },
            holidays: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                validate: {
                    isValidHolidays(value) {
                        if (value === null || value === undefined)
                            return;
                        try {
                            const json = typeof value === "string" ? JSON.parse(value) : value;
                            if (!Array.isArray(json)) {
                                throw new Error("holidays must be a JSON array");
                            }
                        }
                        catch (err) {
                            throw new Error("holidays: must be a valid JSON array: " + err.message);
                        }
                    },
                },
                set(value) {
                    this.setDataValue("holidays", typeof value === "string" ? value : JSON.stringify(value));
                },
                get() {
                    const value = this.getDataValue("holidays");
                    return value ? JSON.parse(value) : null;
                },
                comment: "JSON array of holiday entries: [{date:'YYYY-MM-DD', name?, earlyCloseTime?:'HH:mm'}]",
            },
        }, {
            sequelize,
            modelName: "fxSessionCalendar",
            tableName: "fx_session_calendar",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "fxSessionCalendarNameKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "name" }],
                },
            ],
        });
    }
    static associate(models) {
        fxSessionCalendar.hasMany(models.fxSymbolGroup, {
            as: "symbolGroups",
            foreignKey: "sessionCalendarId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = fxSessionCalendar;
