"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InAppChannel = void 0;
const db_1 = require("@b/db");
const BaseChannel_1 = require("./BaseChannel");
const Websocket_1 = require("@b/handler/Websocket");
class InAppChannel extends BaseChannel_1.BaseChannel {
    constructor() {
        super("IN_APP");
    }
    async send(operation, transaction) {
        try {
            this.validate(operation);
            const { userId, type, data } = operation;
            const title = (data === null || data === void 0 ? void 0 : data.title) || "Notification";
            const message = (data === null || data === void 0 ? void 0 : data.message) || "";
            const link = (data === null || data === void 0 ? void 0 : data.link) || null;
            const relatedId = (data === null || data === void 0 ? void 0 : data.relatedId) || null;
            const actions = (data === null || data === void 0 ? void 0 : data.actions) || null;
            const notification = await db_1.models.notification.create({
                userId,
                type,
                title,
                message,
                link,
                relatedId,
                actions: actions ? JSON.stringify(actions) : null,
                read: false,
                idempotencyKey: operation.idempotencyKey,
                channels: JSON.stringify(["IN_APP"]),
                priority: operation.priority || "NORMAL",
                details: operation.metadata
                    ? JSON.stringify(operation.metadata)
                    : null,
            }, transaction ? { transaction } : undefined);
            this.log(`Notification created in database`, {
                id: notification.id,
                userId,
                type,
            });
            try {
                await this.sendViaWebSocket(userId, {
                    id: notification.id,
                    type: notification.type,
                    title,
                    message,
                    link,
                    actions,
                    createdAt: notification.createdAt,
                });
                this.log(`Notification sent via WebSocket`, {
                    id: notification.id,
                    userId,
                });
            }
            catch (wsError) {
                this.logError(`WebSocket delivery failed`, wsError);
            }
            await this.trackDelivery(notification.id, {
                status: "DELIVERED",
                messageId: `in-app-${notification.id}`,
            });
            return {
                success: true,
                externalId: notification.id,
                messageId: `in-app-${notification.id}`,
            };
        }
        catch (error) {
            this.logError(`Failed to send in-app notification`, error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async sendViaWebSocket(userId, data) {
        try {
            Websocket_1.messageBroker.sendToClient(userId, {
                stream: "notification",
                data: {
                    ...data,
                    timestamp: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            throw error;
        }
    }
    validate(operation) {
        var _a, _b;
        super.validate(operation);
        if (!((_a = operation.data) === null || _a === void 0 ? void 0 : _a.message) && !((_b = operation.data) === null || _b === void 0 ? void 0 : _b.title)) {
            throw new Error("In-app notification requires at least title or message");
        }
    }
}
exports.InAppChannel = InAppChannel;
