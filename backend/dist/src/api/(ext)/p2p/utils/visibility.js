"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUBLIC_VISIBILITY_SQL_RAW = exports.PUBLIC_VISIBILITY_SQL = exports.publicVisibilityWhere = exports.publicVisibilityLiteral = void 0;
const sequelize_1 = require("sequelize");
const PUBLIC_VISIBILITY_EXPR = `(
  CAST(\`p2pOffer\`.\`tradeSettings\` AS CHAR) NOT LIKE '%"visibility":"PRIVATE"%'
  AND CAST(\`p2pOffer\`.\`tradeSettings\` AS CHAR) NOT LIKE '%\\\\"visibility\\\\":\\\\"PRIVATE\\\\"%'
)`;
const PUBLIC_VISIBILITY_EXPR_RAW = `(
  CAST(tradeSettings AS CHAR) NOT LIKE '%"visibility":"PRIVATE"%'
  AND CAST(tradeSettings AS CHAR) NOT LIKE '%\\\\"visibility\\\\":\\\\"PRIVATE\\\\"%'
)`;
const publicVisibilityLiteral = () => (0, sequelize_1.literal)(PUBLIC_VISIBILITY_EXPR);
exports.publicVisibilityLiteral = publicVisibilityLiteral;
const publicVisibilityWhere = () => ({
    [sequelize_1.Op.and]: [(0, exports.publicVisibilityLiteral)()],
});
exports.publicVisibilityWhere = publicVisibilityWhere;
exports.PUBLIC_VISIBILITY_SQL = PUBLIC_VISIBILITY_EXPR;
exports.PUBLIC_VISIBILITY_SQL_RAW = PUBLIC_VISIBILITY_EXPR_RAW;
