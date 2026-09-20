import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * fxEconomicEvent — the economic calendar behind the trading terminal.
 *
 * Two sources share one table:
 *  - PROVIDER rows are synced from the active fx data provider and are
 *    upserted by `externalId` on every sync run.
 *  - MANUAL rows are authored by the operator in the admin panel and are
 *    NEVER touched by the sync (they have a NULL externalId). This is the
 *    load-bearing design decision: an economic calendar is a paid endpoint
 *    on most vendor plans, so a desk without one must still be able to run
 *    a calendar by hand instead of shipping an empty widget.
 *
 * Actual/forecast/previous are STRINGS, not numbers: vendors publish mixed
 * formats ("3.2%", "1.5M", "-0.1") and normalising them would lose the unit
 * the trader actually needs to read.
 */
export default class fxEconomicEvent
  extends Model<fxEconomicEventAttributes, fxEconomicEventCreationAttributes>
  implements fxEconomicEventAttributes
{
  id!: string;
  externalId?: string;
  source!: string;
  provider?: string;
  eventTime!: Date;
  country?: string;
  currency?: string;
  title!: string;
  impact!: string;
  actual?: string;
  forecast?: string;
  /** NOT `previous` — that name collides with Sequelize's Model.previous(). */
  previousValue?: string;
  unit?: string;
  status?: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof fxEconomicEvent {
    return fxEconomicEvent.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        externalId: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment:
            "Stable provider dedup key (<provider>:<hash>) — NULL for operator-authored MANUAL rows",
        },
        source: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: "PROVIDER",
          validate: {
            isIn: {
              args: [["PROVIDER", "MANUAL"]],
              msg: "source: Must be PROVIDER or MANUAL",
            },
          },
        },
        provider: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment: "Data provider name that supplied the row (NULL for MANUAL)",
        },
        eventTime: {
          type: DataTypes.DATE,
          allowNull: false,
          comment: "Scheduled release instant (UTC)",
        },
        country: {
          type: DataTypes.STRING(8),
          allowNull: true,
          comment: "ISO country code of the releasing authority",
        },
        currency: {
          type: DataTypes.STRING(8),
          allowNull: true,
          comment: "Currency the release moves — drives the per-symbol filter",
        },
        title: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "title: Title must not be empty" },
          },
        },
        impact: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: "LOW",
          validate: {
            isIn: {
              args: [["LOW", "MEDIUM", "HIGH"]],
              msg: "impact: Must be LOW, MEDIUM or HIGH",
            },
          },
        },
        actual: {
          type: DataTypes.STRING(32),
          allowNull: true,
          comment: "Released value as published (string — units vary)",
        },
        forecast: {
          type: DataTypes.STRING(32),
          allowNull: true,
        },
        previousValue: {
          type: DataTypes.STRING(32),
          allowNull: true,
          comment: "Prior release value (column name avoids Model.previous())",
        },
        unit: {
          type: DataTypes.STRING(32),
          allowNull: true,
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: true,
          comment: "Visible to clients — lets an operator hide a bad row",
        },
      },
      {
        sequelize,
        modelName: "fxEconomicEvent",
        tableName: "fx_economic_event",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "fxEconomicEventExternalIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "externalId" }],
          },
          {
            name: "fxEconomicEventTimeIndex",
            using: "BTREE",
            fields: [{ name: "eventTime" }],
          },
          {
            name: "fxEconomicEventCurrencyTimeIndex",
            using: "BTREE",
            fields: [{ name: "currency" }, { name: "eventTime" }],
          },
        ],
      }
    );
  }
}
