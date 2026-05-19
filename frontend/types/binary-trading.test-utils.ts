/**
 * Binary Trading Test Utilities
 *
 * Comprehensive testing helpers for all binary order types
 */

import type { BinaryOrder, BinaryOrderType, OrderSide } from "./binary-trading";
import { ORDER_TYPE_CONFIGS } from "./binary-trading";

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

/**
 * Generate a test order with sensible defaults
 */
export function createTestOrder(
  overrides: Partial<BinaryOrder> = {}
): BinaryOrder {
  const now = Date.now();
  const defaultOrder: BinaryOrder = {
    id: `test-${now}`,
    symbol: "BTC/USDT",
    type: "RISE_FALL",
    side: "RISE",
    amount: 100,
    entryPrice: 50000,
    entryTime: now,
    expiryTime: now + 60000, // 1 minute
    closePrice: 0,
    status: "PENDING",
    profit: 0,
    profitPercentage: 80,
    mode: "demo",
  };

  return { ...defaultOrder, ...overrides };
}

/**
 * Generate test order for specific type
 */
export function createOrderByType(
  type: BinaryOrderType,
  overrides: Partial<BinaryOrder> = {}
): BinaryOrder {
  const config = ORDER_TYPE_CONFIGS[type];
  const side = config.allowedSides[0];

  const baseOrder = createTestOrder({
    type,
    side,
    ...overrides,
  });

  // Add type-specific fields
  switch (type) {
    case "HIGHER_LOWER":
    case "TOUCH_NO_TOUCH":
      return {
        ...baseOrder,
        barrier: overrides.barrier ?? baseOrder.entryPrice * 1.01, // 1% above entry
      };

    case "CALL_PUT":
      return {
        ...baseOrder,
        strikePrice: overrides.strikePrice ?? baseOrder.entryPrice * 1.005, // 0.5% above entry
      };

    case "TURBO":
      return {
        ...baseOrder,
        barrier: overrides.barrier ?? baseOrder.entryPrice * 1.002, // 0.2% above entry
        payoutPerPoint: overrides.payoutPerPoint ?? 1.0,
      };

    default:
      return baseOrder;
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate order has required fields for its type
 */
export function validateOrderFields(order: BinaryOrder): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const config = ORDER_TYPE_CONFIGS[order.type];

  // Check basic fields
  if (!order.id) errors.push("Missing order ID");
  if (!order.symbol) errors.push("Missing symbol");
  if (!order.amount || order.amount <= 0) errors.push("Invalid amount");
  if (!order.entryPrice || order.entryPrice <= 0) errors.push("Invalid entry price");

  // Check side is valid for type
  if (!config.allowedSides.includes(order.side)) {
    errors.push(`Invalid side ${order.side} for type ${order.type}`);
  }

  // Check type-specific requirements
  if (config.requiresBarrier && !order.barrier) {
    errors.push(`${order.type} requires barrier price`);
  }

  if (config.requiresStrikePrice && !order.strikePrice) {
    errors.push(`${order.type} requires strike price`);
  }

  if (config.requiresPayoutPerPoint && !order.payoutPerPoint) {
    errors.push(`${order.type} requires payout per point`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate barrier is reasonable relative to entry price
 */
export function validateBarrier(
  entryPrice: number,
  barrier: number,
  type: BinaryOrderType
): { valid: boolean; message?: string } {
  const distance = Math.abs(barrier - entryPrice);
  const distancePercent = (distance / entryPrice) * 100;

  // Type-specific barrier validation
  switch (type) {
    case "HIGHER_LOWER":
      // Allow 0.1% to 10% distance
      if (distancePercent < 0.1) {
        return { valid: false, message: "Barrier too close to entry price (min 0.1%)" };
      }
      if (distancePercent > 10) {
        return { valid: false, message: "Barrier too far from entry price (max 10%)" };
      }
      break;

    case "TOUCH_NO_TOUCH":
      // Allow 0.5% to 5% distance (harder to touch)
      if (distancePercent < 0.5) {
        return { valid: false, message: "Barrier too close for TOUCH/NO_TOUCH (min 0.5%)" };
      }
      if (distancePercent > 5) {
        return { valid: false, message: "Barrier too far for TOUCH/NO_TOUCH (max 5%)" };
      }
      break;

    case "TURBO":
      // Allow 0.05% to 1% distance (very tight)
      if (distancePercent < 0.05) {
        return { valid: false, message: "Barrier too close for TURBO (min 0.05%)" };
      }
      if (distancePercent > 1) {
        return { valid: false, message: "Barrier too far for TURBO (max 1%)" };
      }
      break;
  }

  return { valid: true };
}

/**
 * Validate strike price for CALL/PUT
 */
export function validateStrikePrice(
  entryPrice: number,
  strikePrice: number
): { valid: boolean; message?: string } {
  const distance = Math.abs(strikePrice - entryPrice);
  const distancePercent = (distance / entryPrice) * 100;

  // Strike can be ITM, ATM, or OTM (wide range)
  if (distancePercent > 10) {
    return { valid: false, message: "Strike too far from current price (max 10%)" };
  }

  return { valid: true };
}

// ============================================================================
// SETTLEMENT CALCULATION HELPERS
// ============================================================================

/**
 * Calculate if RISE_FALL order wins
 */
export function calculateRiseFallWin(order: BinaryOrder, closePrice: number): boolean {
  if (order.type !== "RISE_FALL") {
    throw new Error("Order must be RISE_FALL type");
  }

  if (order.side === "RISE") {
    return closePrice > order.entryPrice;
  } else {
    return closePrice < order.entryPrice;
  }
}

/**
 * Calculate if HIGHER_LOWER order wins
 */
export function calculateHigherLowerWin(order: BinaryOrder, closePrice: number): boolean {
  if (order.type !== "HIGHER_LOWER" || !order.barrier) {
    throw new Error("Order must be HIGHER_LOWER type with barrier");
  }

  if (order.side === "HIGHER") {
    return closePrice > order.barrier;
  } else {
    return closePrice < order.barrier;
  }
}

/**
 * Calculate if TOUCH_NO_TOUCH order wins
 * @param touchOccurred - Did price touch the barrier during the order lifetime?
 */
export function calculateTouchWin(order: BinaryOrder, touchOccurred: boolean): boolean {
  if (order.type !== "TOUCH_NO_TOUCH" || !order.barrier) {
    throw new Error("Order must be TOUCH_NO_TOUCH type with barrier");
  }

  if (order.side === "TOUCH") {
    return touchOccurred;
  } else {
    return !touchOccurred;
  }
}

/**
 * Calculate if CALL_PUT order wins
 */
export function calculateCallPutWin(order: BinaryOrder, closePrice: number): boolean {
  if (order.type !== "CALL_PUT" || !order.strikePrice) {
    throw new Error("Order must be CALL_PUT type with strike price");
  }

  if (order.side === "CALL") {
    return closePrice > order.strikePrice;
  } else {
    return closePrice < order.strikePrice;
  }
}

/**
 * Calculate TURBO order result
 * @param closePrice - Final close price
 * @param breachOccurred - Did price breach barrier during lifetime?
 */
export function calculateTurboResult(
  order: BinaryOrder,
  closePrice: number,
  breachOccurred: boolean
): { win: boolean; profit: number } {
  if (order.type !== "TURBO" || !order.barrier || !order.payoutPerPoint) {
    throw new Error("Order must be TURBO type with barrier and payout per point");
  }

  // Instant loss if barrier breached
  if (breachOccurred) {
    return { win: false, profit: -order.amount };
  }

  // Calculate profit based on distance from barrier
  const points = Math.abs(closePrice - order.barrier);
  const potentialProfit = points * order.payoutPerPoint;

  // Win if moved in correct direction
  let win = false;
  if (order.side === "UP") {
    win = closePrice > order.entryPrice;
  } else {
    win = closePrice < order.entryPrice;
  }

  return {
    win,
    profit: win ? potentialProfit : -order.amount,
  };
}

/**
 * Calculate profit for standard binary options
 */
export function calculateStandardProfit(
  order: BinaryOrder,
  isWin: boolean
): number {
  if (isWin) {
    return order.amount * (order.profitPercentage / 100);
  } else {
    return -order.amount;
  }
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

/**
 * Test scenario types
 */
type StandardScenario = {
  name: string;
  order: BinaryOrder;
  closePrice: number;
  expectedWin: boolean;
};

type TouchScenario = {
  name: string;
  order: BinaryOrder;
  touchOccurred: boolean;
  expectedWin: boolean;
};

type TurboScenario = {
  name: string;
  order: BinaryOrder;
  closePrice: number;
  breachOccurred: boolean;
  expectedWin: boolean;
};

/**
 * Test scenarios for each order type
 */
export const TEST_SCENARIOS: {
  RISE_FALL: StandardScenario[];
  HIGHER_LOWER: StandardScenario[];
  TOUCH_NO_TOUCH: TouchScenario[];
  CALL_PUT: StandardScenario[];
  TURBO: TurboScenario[];
} = {
  RISE_FALL: [
    {
      name: "Win - Price rises",
      order: createOrderByType("RISE_FALL", { side: "RISE", entryPrice: 50000 }),
      closePrice: 50100,
      expectedWin: true,
    },
    {
      name: "Loss - Price falls",
      order: createOrderByType("RISE_FALL", { side: "RISE", entryPrice: 50000 }),
      closePrice: 49900,
      expectedWin: false,
    },
    {
      name: "Win - Price falls (FALL side)",
      order: createOrderByType("RISE_FALL", { side: "FALL", entryPrice: 50000 }),
      closePrice: 49900,
      expectedWin: true,
    },
  ],

  HIGHER_LOWER: [
    {
      name: "Win - Price above barrier",
      order: createOrderByType("HIGHER_LOWER", {
        side: "HIGHER",
        entryPrice: 50000,
        barrier: 50200,
      }),
      closePrice: 50300,
      expectedWin: true,
    },
    {
      name: "Loss - Price below barrier",
      order: createOrderByType("HIGHER_LOWER", {
        side: "HIGHER",
        entryPrice: 50000,
        barrier: 50200,
      }),
      closePrice: 50100,
      expectedWin: false,
    },
  ],

  TOUCH_NO_TOUCH: [
    {
      name: "Win - Barrier touched",
      order: createOrderByType("TOUCH_NO_TOUCH", {
        side: "TOUCH",
        entryPrice: 50000,
        barrier: 50500,
      }),
      touchOccurred: true,
      expectedWin: true,
    },
    {
      name: "Win - Barrier not touched",
      order: createOrderByType("TOUCH_NO_TOUCH", {
        side: "NO_TOUCH",
        entryPrice: 50000,
        barrier: 50500,
      }),
      touchOccurred: false,
      expectedWin: true,
    },
  ],

  CALL_PUT: [
    {
      name: "Win - Price above strike (CALL)",
      order: createOrderByType("CALL_PUT", {
        side: "CALL",
        entryPrice: 50000,
        strikePrice: 50200,
      }),
      closePrice: 50300,
      expectedWin: true,
    },
    {
      name: "Win - Price below strike (PUT)",
      order: createOrderByType("CALL_PUT", {
        side: "PUT",
        entryPrice: 50000,
        strikePrice: 50200,
      }),
      closePrice: 50100,
      expectedWin: true,
    },
  ],

  TURBO: [
    {
      name: "Win - No breach, correct direction",
      order: createOrderByType("TURBO", {
        side: "UP",
        entryPrice: 50000,
        barrier: 50100,
        payoutPerPoint: 1.0,
      }),
      closePrice: 50050,
      breachOccurred: false,
      expectedWin: true,
    },
    {
      name: "Loss - Barrier breached",
      order: createOrderByType("TURBO", {
        side: "UP",
        entryPrice: 50000,
        barrier: 50100,
        payoutPerPoint: 1.0,
      }),
      closePrice: 50150,
      breachOccurred: true,
      expectedWin: false,
    },
  ],
};

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert order is valid
 */
export function assertOrderValid(order: BinaryOrder): void {
  const validation = validateOrderFields(order);
  if (!validation.valid) {
    throw new Error(`Invalid order: ${validation.errors.join(", ")}`);
  }
}

/**
 * Assert order result matches expected
 */
export function assertOrderResult(
  order: BinaryOrder,
  actualWin: boolean,
  expectedWin: boolean,
  scenarioName: string
): void {
  if (actualWin !== expectedWin) {
    throw new Error(
      `Scenario "${scenarioName}" failed: Expected ${expectedWin ? "WIN" : "LOSS"}, got ${actualWin ? "WIN" : "LOSS"}`
    );
  }
}

/**
 * Run all test scenarios for a given order type
 */
export function runTestScenarios(type: BinaryOrderType): {
  passed: number;
  failed: number;
  errors: string[];
} {
  const scenarios = TEST_SCENARIOS[type];
  const errors: string[] = [];
  let passed = 0;
  let failed = 0;

  for (const scenario of scenarios) {
    try {
      let actualWin: boolean;

      switch (type) {
        case "RISE_FALL": {
          const s = scenario as StandardScenario;
          actualWin = calculateRiseFallWin(s.order, s.closePrice);
          break;
        }
        case "HIGHER_LOWER": {
          const s = scenario as StandardScenario;
          actualWin = calculateHigherLowerWin(s.order, s.closePrice);
          break;
        }
        case "TOUCH_NO_TOUCH": {
          const s = scenario as TouchScenario;
          actualWin = calculateTouchWin(s.order, s.touchOccurred);
          break;
        }
        case "CALL_PUT": {
          const s = scenario as StandardScenario;
          actualWin = calculateCallPutWin(s.order, s.closePrice);
          break;
        }
        case "TURBO": {
          const s = scenario as TurboScenario;
          const result = calculateTurboResult(
            s.order,
            s.closePrice,
            s.breachOccurred
          );
          actualWin = result.win;
          break;
        }
        default:
          throw new Error(`Unknown order type: ${type}`);
      }

      assertOrderResult(scenario.order, actualWin, scenario.expectedWin, scenario.name);
      passed++;
    } catch (error) {
      failed++;
      errors.push(`${scenario.name}: ${error}`);
    }
  }

  return { passed, failed, errors };
}
