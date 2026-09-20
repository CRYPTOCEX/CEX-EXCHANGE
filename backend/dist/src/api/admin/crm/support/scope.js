"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORT_QUEUE_SCOPE_SQL = exports.supportQueueCountScope = void 0;
exports.supportQueueScope = supportQueueScope;
const sequelize_1 = require("sequelize");
const HAS_MESSAGES = (0, sequelize_1.literal)("((JSON_TYPE(`supportTicket`.`messages`) = 'ARRAY' AND JSON_LENGTH(`supportTicket`.`messages`) > 0)" +
    " OR (JSON_TYPE(`supportTicket`.`messages`) = 'STRING'" +
    " AND CHAR_LENGTH(JSON_UNQUOTE(`supportTicket`.`messages`)) > 2))");
function supportQueueScope() {
    return {
        [sequelize_1.Op.or]: [{ type: { [sequelize_1.Op.ne]: "LIVE" } }, HAS_MESSAGES],
    };
}
exports.supportQueueCountScope = supportQueueScope;
exports.SUPPORT_QUEUE_SCOPE_SQL = "(t.type <> 'LIVE'" +
    " OR (JSON_TYPE(t.messages) = 'ARRAY' AND JSON_LENGTH(t.messages) > 0)" +
    " OR (JSON_TYPE(t.messages) = 'STRING' AND CHAR_LENGTH(JSON_UNQUOTE(t.messages)) > 2))";
