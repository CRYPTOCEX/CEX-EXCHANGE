"use strict";
const { sequelize, models } = require("@b/db");
const { createError } = require("@b/utils/error");
// One connection-scoped lock covers matching and cancellation in all updated
// workers. No expiring lease can silently lapse during a slow Scylla write.
exports.withFuturesEngineLock = async function (work) {
    const t = await sequelize.transaction();
    let acquired = false;
    try {
        const [rows] = await sequelize.query("SELECT GET_LOCK('bicrypto:futures:engine:v1', 0) AS acquired", { transaction: t });
        if (Number(rows?.[0]?.acquired) !== 1) throw createError({ statusCode: 503, message: "Futures engine is busy; retry the same request" });
        acquired = true;
        const pending = await models.settings.findOne({ where: { key: "futuresEnginePendingCycle" } });
        if (pending) throw createError({ statusCode: 503, message: "Futures settlement recovery is required before further trading or refunds" });
        return await work();
    } finally {
        try {
            if (acquired) await sequelize.query("SELECT RELEASE_LOCK('bicrypto:futures:engine:v1')", { transaction: t });
        } finally {
            if (!t.finished) await t.rollback();
        }
    }
};
