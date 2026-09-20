"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletionTombstoneEmail = deletionTombstoneEmail;
exports.anonymizeUserForDeletion = anonymizeUserForDeletion;
exports.anonymizeAndSoftDeleteUser = anonymizeAndSoftDeleteUser;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
function deletionTombstoneEmail(userId) {
    return `deleted-${userId}@deleted.invalid`;
}
async function anonymizeUserForDeletion(userId, transaction) {
    await db_1.models.user.update({
        email: deletionTombstoneEmail(userId),
        password: null,
        firstName: null,
        lastName: null,
        phone: null,
        phoneVerified: false,
        avatar: null,
        username: null,
        walletAddress: null,
        walletProvider: null,
        profile: null,
        emailVerified: false,
        settings: null,
        status: "INACTIVE",
    }, { where: { id: userId }, transaction, validate: false });
    await db_1.models.providerUser.destroy({
        where: { userId },
        force: true,
        transaction,
    });
}
async function anonymizeAndSoftDeleteUser(userId) {
    await db_1.sequelize.transaction(async (transaction) => {
        await anonymizeUserForDeletion(userId, transaction);
        await db_1.models.user.destroy({ where: { id: userId }, transaction });
    });
    console_1.logger.info("ACCOUNT", `Account ${userId} anonymised and closed; financial and KYC records retained`);
}
