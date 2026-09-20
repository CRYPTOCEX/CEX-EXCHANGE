import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class fxSymbolGroup
  extends Model<fxSymbolGroupAttributes, fxSymbolGroupCreationAttributes>
  implements fxSymbolGroupAttributes
{
  id!: string;
  name!: string;
  leverage!: number;
  spreadMarkupPips!: number;
  hedgedMarginRate!: number;
  commissionPerLot!: number;
  swapMarkupPercent!: number;
  tripleSwapDay!: string;
  swapDays!: string;
  swapFreeAllowed?: boolean;
  sessionCalendarId?: string;
  marginCurrency!: string;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof fxSymbolGroup {
    return fxSymbolGroup.init(
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
            notEmpty: { msg: "name: Name must not be empty" },
          },
          comment: "Group name (e.g. FX Majors, US Stocks, Metals, Energy)",
        },
        leverage: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 100,
          validate: {
            isInt: { msg: "leverage: Leverage must be an integer" },
            min: { args: [1], msg: "leverage: Leverage must be at least 1" },
          },
          comment: "Maximum leverage for instruments in this group",
        },
        spreadMarkupPips: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "spreadMarkupPips: Spread markup must be a number" },
            min: { args: [0], msg: "spreadMarkupPips: Spread markup must be >= 0" },
          },
          comment:
            "Total spread widening in pips: executedAsk = feedAsk + markup/2, executedBid = feedBid - markup/2",
        },
        hedgedMarginRate: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "hedgedMarginRate: Hedged margin rate must be a number" },
            min: { args: [0], msg: "hedgedMarginRate: Hedged margin rate must be >= 0" },
            max: { args: [1], msg: "hedgedMarginRate: Hedged margin rate must be <= 1" },
          },
          comment:
            "Fraction of margin charged on the covered (hedged) volume; account margin per symbol = max(long,short)/leverage + hedgedMarginRate * min(long,short)/leverage",
        },
        commissionPerLot: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "commissionPerLot: Commission must be a number" },
            min: { args: [0], msg: "commissionPerLot: Commission must be >= 0" },
          },
          comment:
            "Commission in account currency per standard lot per side, charged in full at position open (round-turn priced)",
        },
        swapMarkupPercent: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "swapMarkupPercent: Swap markup must be a number" },
          },
          comment: "Percentage markup applied on top of instrument swap points",
        },
        tripleSwapDay: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: "WED",
          validate: {
            isIn: {
              args: [["MON", "TUE", "WED", "THU", "FRI"]],
              msg: "tripleSwapDay: Must be one of MON, TUE, WED, THU, FRI",
            },
          },
          comment: "Day the 3x swap is charged (WED for FX/metals, FRI for indices/equity CFDs)",
        },
        swapDays: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: "WEEKDAYS",
          validate: {
            isIn: {
              args: [["WEEKDAYS", "ALL"]],
              msg: "swapDays: Must be WEEKDAYS or ALL",
            },
          },
          comment:
            "Which days swap is charged: WEEKDAYS (Mon-Fri, FX/metals/stocks) or ALL (7d/week, crypto CFD financing)",
        },
        swapFreeAllowed: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "swapFreeAllowed: Must be a boolean value" },
          },
          comment: "Whether swap-free (Islamic) accounts skip swaps on this group",
        },
        sessionCalendarId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION,
              msg: "sessionCalendarId: Must be a valid UUID",
            },
          },
          comment: "Trading-hours calendar; null = 24/7 (crypto CFDs)",
        },
        marginCurrency: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: "USD",
          validate: {
            notEmpty: { msg: "marginCurrency: Margin currency must not be empty" },
          },
          comment: "RESERVED (no-op): margin is always computed in the instrument quote currency and hub-converted to the account currency; column kept for schema compat, defaulted USD, not accepted by the admin API",
        },
      },
      {
        sequelize,
        modelName: "fxSymbolGroup",
        tableName: "fx_symbol_group",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "fxSymbolGroupNameKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "name" }],
          },
          {
            name: "fxSymbolGroupSessionCalendarIdIdx",
            using: "BTREE",
            fields: [{ name: "sessionCalendarId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    fxSymbolGroup.belongsTo(models.fxSessionCalendar, {
      as: "sessionCalendar",
      foreignKey: "sessionCalendarId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    fxSymbolGroup.hasMany(models.fxInstrument, {
      as: "instruments",
      foreignKey: "groupId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
