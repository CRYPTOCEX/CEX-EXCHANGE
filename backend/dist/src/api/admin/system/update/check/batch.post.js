"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = {
  summary: "Batch update check (bypassed)",
  operationId: "batchUpdateCheck",
  tags: ["Admin", "System"],
  requiresAuth: true,
  responses: { 200: { description: "ok" } },
};
exports.default = async () => ({ status: true, message: "Batch update check completed", products: [] });
