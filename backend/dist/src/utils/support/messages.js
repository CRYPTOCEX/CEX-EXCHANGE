"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readMessages = readMessages;
exports.newMessageKey = newMessageKey;
exports.lastMessageFields = lastMessageFields;
exports.appendSupportMessage = appendSupportMessage;
exports.replaceSupportMessage = replaceSupportMessage;
exports.lastMessageIsFromCustomer = lastMessageIsFromCustomer;
exports.countConversationalMessages = countConversationalMessages;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const passwords_1 = require("@b/utils/passwords");
function readMessages(raw) {
    if (!raw)
        return [];
    if (Array.isArray(raw))
        return raw;
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed))
                return parsed;
            if (typeof parsed === "string") {
                try {
                    const inner = JSON.parse(parsed);
                    return Array.isArray(inner) ? inner : [];
                }
                catch (_a) {
                    return [];
                }
            }
            return [];
        }
        catch (error) {
            console_1.logger.error("SUPPORT", "Failed to parse ticket messages JSON", error);
            return [];
        }
    }
    return [];
}
function newMessageKey(prefix = "msg") {
    return `${prefix}-${(0, passwords_1.makeUuid)()}`;
}
function lastMessageFields(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message.system)
            continue;
        const at = message.time ? new Date(message.time) : null;
        return {
            lastMessageAt: at && Number.isFinite(at.getTime()) ? at : null,
            lastMessageFrom: message.type === "client" ? "client" : "agent",
        };
    }
    return { lastMessageAt: null, lastMessageFrom: null };
}
async function appendSupportMessage(ticketId, message, options = {}) {
    const { status, rejectIfClosed = true, guard, extraFields } = options;
    const stamped = {
        ...message,
        time: message.time || new Date().toISOString(),
        key: message.key || newMessageKey(message.ai ? "ai" : "msg"),
    };
    return db_1.sequelize.transaction(async (transaction) => {
        const ticket = await db_1.models.supportTicket.findByPk(ticketId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!ticket) {
            return { appended: false, reason: "not_found", messages: [] };
        }
        if (rejectIfClosed && ticket.status === "CLOSED") {
            return {
                appended: false,
                reason: "closed",
                messages: readMessages(ticket.messages),
                status: ticket.status,
                ticket,
            };
        }
        const current = readMessages(ticket.messages);
        if (guard) {
            const ok = await guard(ticket, current);
            if (!ok) {
                return {
                    appended: false,
                    reason: "guard",
                    messages: current,
                    status: ticket.status,
                    ticket,
                };
            }
        }
        const next = [...current, stamped];
        await ticket.update({
            messages: next,
            ...lastMessageFields(next),
            ...(status ? { status } : {}),
            ...(extraFields || {}),
        }, { transaction });
        return {
            appended: true,
            message: stamped,
            messages: next,
            status: status || ticket.status,
            ticket,
        };
    });
}
async function replaceSupportMessage(ticketId, key, patch) {
    return db_1.sequelize.transaction(async (transaction) => {
        const ticket = await db_1.models.supportTicket.findByPk(ticketId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!ticket) {
            return { appended: false, reason: "not_found", messages: [] };
        }
        const current = readMessages(ticket.messages);
        const index = current.findIndex((m) => m.key === key);
        if (index === -1) {
            return {
                appended: false,
                reason: "guard",
                messages: current,
                ticket,
            };
        }
        const next = [...current];
        next[index] = { ...next[index], ...patch };
        await ticket.update({ messages: next, ...lastMessageFields(next) }, { transaction });
        return {
            appended: true,
            message: next[index],
            messages: next,
            status: ticket.status,
            ticket,
        };
    });
}
function lastMessageIsFromCustomer(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.system)
            continue;
        return m.type === "client";
    }
    return false;
}
function countConversationalMessages(messages) {
    return messages.filter((m) => !m.system).length;
}
