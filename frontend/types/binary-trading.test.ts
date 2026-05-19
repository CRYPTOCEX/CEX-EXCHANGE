import { describe, it, expect } from "vitest";
import {
  isActiveOrder,
  isCompletedOrder,
  isProfitableOrder,
  isWinStatus,
  isLossStatus,
  canCancelOrder,
  canCloseEarly,
  type BinaryOrder,
} from "./binary-trading";

// Helper to create mock orders
const createMockOrder = (overrides: Partial<BinaryOrder> = {}): BinaryOrder => ({
  id: "order-1",
  symbol: "BTC/USDT",
  side: "RISE",
  amount: 100,
  entryPrice: 50000,
  entryTime: Date.now() - 60000, // 1 minute ago
  expiryTime: Date.now() + 60000, // 1 minute from now
  status: "PENDING",
  profitPercentage: 85,
  mode: "demo",
  ...overrides,
});

describe("Binary Trading Type Guards", () => {
  describe("isActiveOrder", () => {
    it("should return true for PENDING orders", () => {
      const order = createMockOrder({ status: "PENDING" });
      expect(isActiveOrder(order)).toBe(true);
    });

    it("should return false for completed orders", () => {
      expect(isActiveOrder(createMockOrder({ status: "WIN" }))).toBe(false);
      expect(isActiveOrder(createMockOrder({ status: "LOSS" }))).toBe(false);
      expect(isActiveOrder(createMockOrder({ status: "CANCELLED" }))).toBe(false);
    });
  });

  describe("isCompletedOrder", () => {
    it("should return true for completed status types", () => {
      expect(isCompletedOrder(createMockOrder({ status: "WIN" }))).toBe(true);
      expect(isCompletedOrder(createMockOrder({ status: "LOSS" }))).toBe(true);
      expect(isCompletedOrder(createMockOrder({ status: "DRAW" }))).toBe(true);
      expect(isCompletedOrder(createMockOrder({ status: "CANCELLED" }))).toBe(true);
      expect(isCompletedOrder(createMockOrder({ status: "CLOSED_EARLY" }))).toBe(true);
      expect(isCompletedOrder(createMockOrder({ status: "EXPIRED" }))).toBe(true);
    });

    it("should return false for PENDING orders", () => {
      expect(isCompletedOrder(createMockOrder({ status: "PENDING" }))).toBe(false);
    });
  });

  describe("isProfitableOrder", () => {
    it("should return true for WIN status", () => {
      const order = createMockOrder({ status: "WIN", profit: 85 });
      expect(isProfitableOrder(order)).toBe(true);
    });

    it("should return true for positive profit", () => {
      const order = createMockOrder({ status: "CLOSED_EARLY", profit: 50 });
      expect(isProfitableOrder(order)).toBe(true);
    });

    it("should return false for LOSS status", () => {
      const order = createMockOrder({ status: "LOSS", profit: -100 });
      expect(isProfitableOrder(order)).toBe(false);
    });

    it("should return false for zero or negative profit", () => {
      const order = createMockOrder({ status: "CLOSED_EARLY", profit: 0 });
      expect(isProfitableOrder(order)).toBe(false);
    });
  });

  describe("isWinStatus / isLossStatus", () => {
    it("isWinStatus should return true only for WIN", () => {
      expect(isWinStatus("WIN")).toBe(true);
      expect(isWinStatus("LOSS")).toBe(false);
      expect(isWinStatus("PENDING")).toBe(false);
    });

    it("isLossStatus should return true only for LOSS", () => {
      expect(isLossStatus("LOSS")).toBe(true);
      expect(isLossStatus("WIN")).toBe(false);
      expect(isLossStatus("PENDING")).toBe(false);
    });
  });

  describe("canCancelOrder", () => {
    it("should return true for PENDING orders with enough time", () => {
      const order = createMockOrder({
        status: "PENDING",
        expiryTime: Date.now() + 60000, // 60 seconds from now
      });
      expect(canCancelOrder(order)).toBe(true);
    });

    it("should return false for PENDING orders close to expiry", () => {
      const order = createMockOrder({
        status: "PENDING",
        expiryTime: Date.now() + 5000, // Only 5 seconds from now
      });
      expect(canCancelOrder(order)).toBe(false);
    });

    it("should return false for non-PENDING orders", () => {
      expect(canCancelOrder(createMockOrder({ status: "WIN" }))).toBe(false);
      expect(canCancelOrder(createMockOrder({ status: "LOSS" }))).toBe(false);
    });
  });

  describe("canCloseEarly", () => {
    it("should return true for valid early close conditions", () => {
      const now = Date.now();
      const order = createMockOrder({
        status: "PENDING",
        entryTime: now - 60000, // 60 seconds ago
        expiryTime: now + 60000, // 60 seconds from now
      });
      expect(canCloseEarly(order)).toBe(true);
    });

    it("should return false for orders too close to entry", () => {
      const now = Date.now();
      const order = createMockOrder({
        status: "PENDING",
        entryTime: now - 10000, // Only 10 seconds ago
        expiryTime: now + 60000,
      });
      expect(canCloseEarly(order)).toBe(false);
    });

    it("should return false for orders too close to expiry", () => {
      const now = Date.now();
      const order = createMockOrder({
        status: "PENDING",
        entryTime: now - 60000,
        expiryTime: now + 5000, // Only 5 seconds from now
      });
      expect(canCloseEarly(order)).toBe(false);
    });

    it("should return false for non-PENDING orders", () => {
      const now = Date.now();
      const order = createMockOrder({
        status: "WIN",
        entryTime: now - 60000,
        expiryTime: now + 60000,
      });
      expect(canCloseEarly(order)).toBe(false);
    });
  });
});

describe("Binary Order Type", () => {
  it("should have all required properties", () => {
    const order: BinaryOrder = {
      id: "test-1",
      symbol: "BTC/USDT",
      side: "RISE",
      amount: 100,
      entryPrice: 50000,
      entryTime: Date.now(),
      expiryTime: Date.now() + 60000,
      status: "PENDING",
      profitPercentage: 85,
      mode: "demo",
    };

    expect(order.id).toBeDefined();
    expect(order.symbol).toBeDefined();
    expect(order.side).toMatch(/^(RISE|FALL)$/);
    expect(order.amount).toBeGreaterThan(0);
    expect(order.entryPrice).toBeGreaterThan(0);
    expect(order.entryTime).toBeGreaterThan(0);
    expect(order.expiryTime).toBeGreaterThan(order.entryTime);
    expect(order.status).toBeDefined();
    expect(order.profitPercentage).toBeGreaterThan(0);
    expect(order.mode).toMatch(/^(demo|real)$/);
  });

  it("should allow optional properties", () => {
    const order: BinaryOrder = {
      id: "test-1",
      symbol: "BTC/USDT",
      side: "FALL",
      amount: 100,
      entryPrice: 50000,
      entryTime: Date.now(),
      expiryTime: Date.now() + 60000,
      status: "WIN",
      profitPercentage: 85,
      mode: "real",
      closePrice: 49500,
      closedAt: Date.now() + 60000,
      profit: 85,
      metadata: {
        notes: "Test trade",
        tags: ["bitcoin", "short-term"],
      },
    };

    expect(order.closePrice).toBe(49500);
    expect(order.profit).toBe(85);
    expect(order.metadata?.notes).toBe("Test trade");
  });
});
