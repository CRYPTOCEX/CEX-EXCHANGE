// P2P Trade Status Utilities
// Normalizes status between backend (uppercase) and frontend (various formats)

// Valid database statuses: PENDING, PAYMENT_SENT, COMPLETED, CANCELLED, DISPUTED, EXPIRED
export const P2P_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  PAYMENT_SENT: 'PAYMENT_SENT',
  ESCROW_RELEASED: 'ESCROW_RELEASED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED',
  EXPIRED: 'EXPIRED',
} as const;

export type P2PStatus = typeof P2P_STATUS[keyof typeof P2P_STATUS];

export const P2P_STATUS_DISPLAY = {
  PENDING: 'Waiting for Payment',
  PAYMENT_SENT: 'Payment Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DISPUTED: 'Disputed',
  EXPIRED: 'Expired',
} as const;

export const P2P_STATUS_COLOR = {
  PENDING: 'yellow',
  PAYMENT_SENT: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'gray',
  DISPUTED: 'red',
  EXPIRED: 'gray',
} as const;

/**
 * Normalizes P2P trade status from various frontend formats to backend format
 * @param status - Status string from API or frontend
 * @returns Normalized uppercase status
 */
export function normalizeP2PStatus(status: string): P2PStatus {
  // Map old frontend statuses to backend statuses
  const statusMap: Record<string, P2PStatus> = {
    'waiting_payment': P2P_STATUS.PENDING,
    'pending': P2P_STATUS.PENDING,
    'in_progress': P2P_STATUS.PENDING,
    'payment_confirmed': P2P_STATUS.PAYMENT_SENT,
    'payment_sent': P2P_STATUS.PAYMENT_SENT,
    'escrow_released': P2P_STATUS.COMPLETED, // Map old escrow_released to COMPLETED
    'completed': P2P_STATUS.COMPLETED,
    'cancelled': P2P_STATUS.CANCELLED,
    'canceled': P2P_STATUS.CANCELLED,
    'disputed': P2P_STATUS.DISPUTED,
    'dispute': P2P_STATUS.DISPUTED,
    'expired': P2P_STATUS.EXPIRED,
  };

  const lowercaseStatus = status.toLowerCase();
  return statusMap[lowercaseStatus] || (status.toUpperCase() as P2PStatus);
}

/**
 * Get display text for a status
 */
export function getStatusDisplay(status: string): string {
  const normalized = normalizeP2PStatus(status);
  return P2P_STATUS_DISPLAY[normalized] || status;
}

/**
 * Get color for a status
 */
export function getStatusColor(status: string): string {
  const normalized = normalizeP2PStatus(status);
  return P2P_STATUS_COLOR[normalized] || 'gray';
}

// Status check helpers
export function isWaitingPayment(status: string): boolean {
  const normalized = normalizeP2PStatus(status);
  return normalized === P2P_STATUS.PENDING;
}

export function isPaymentSent(status: string): boolean {
  const normalized = normalizeP2PStatus(status);
  return normalized === P2P_STATUS.PAYMENT_SENT;
}

export function isCompleted(status: string): boolean {
  const normalized = normalizeP2PStatus(status);
  return normalized === P2P_STATUS.COMPLETED;
}

export function isCancelled(status: string): boolean {
  const normalized = normalizeP2PStatus(status);
  return normalized === P2P_STATUS.CANCELLED;
}

export function isDisputed(status: string): boolean {
  const normalized = normalizeP2PStatus(status);
  return normalized === P2P_STATUS.DISPUTED;
}

/**
 * Check if trade is in an active state (not completed/cancelled/disputed/expired)
 */
export function isTradeActive(status: string): boolean {
  const normalized = normalizeP2PStatus(status);
  return normalized === P2P_STATUS.PENDING || normalized === P2P_STATUS.PAYMENT_SENT;
}

export function isExpired(status: string): boolean {
  const normalized = normalizeP2PStatus(status);
  return normalized === P2P_STATUS.EXPIRED;
}

/**
 * Check if dispute can be filed for this trade status
 * Based on backend TRADE_STATUS_TRANSITIONS:
 * - PENDING: NO (can only go to PAYMENT_SENT, CANCELLED)
 * - PAYMENT_SENT: YES (can go to COMPLETED, DISPUTED, CANCELLED)
 * - COMPLETED: YES (can go to DISPUTED within time limit)
 */
export function canDispute(status: string): boolean {
  const normalized = normalizeP2PStatus(status);
  return (
    normalized === P2P_STATUS.PAYMENT_SENT ||
    normalized === P2P_STATUS.COMPLETED
  );
}

/**
 * Check if trade is in a final state (completed/cancelled/disputed/expired)
 */
export function isTradeFinal(status: string): boolean {
  const normalized = normalizeP2PStatus(status);
  return (
    normalized === P2P_STATUS.COMPLETED ||
    normalized === P2P_STATUS.CANCELLED ||
    normalized === P2P_STATUS.DISPUTED ||
    normalized === P2P_STATUS.EXPIRED
  );
}
