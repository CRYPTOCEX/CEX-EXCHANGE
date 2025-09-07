import validator from "validator";
import { createError } from "@b/utils/error";

// Trade status transitions state machine
const TRADE_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PAYMENT_SENT", "CANCELLED"],
  PAYMENT_SENT: ["ESCROW_RELEASED", "DISPUTED", "CANCELLED"],
  ESCROW_RELEASED: ["COMPLETED", "DISPUTED"],
  COMPLETED: ["DISPUTED"], // Can still dispute after completion within time limit
  DISPUTED: ["COMPLETED", "CANCELLED"],
  CANCELLED: [], // Terminal state
  EXPIRED: [], // Terminal state
};

// Offer status transitions
const OFFER_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING_APPROVAL", "CANCELLED"],
  PENDING_APPROVAL: ["ACTIVE", "REJECTED"],
  ACTIVE: ["PAUSED", "COMPLETED", "CANCELLED"],
  PAUSED: ["ACTIVE", "CANCELLED"],
  COMPLETED: [], // Terminal state
  CANCELLED: [], // Terminal state
  REJECTED: [], // Terminal state
  EXPIRED: [], // Terminal state
};

/**
 * Validates trade amount
 */
export function validateTradeAmount(amount: any): boolean {
  if (typeof amount !== "number" || isNaN(amount)) {
    return false;
  }
  // Minimum trade amount (configurable)
  const MIN_TRADE_AMOUNT = 0.01;
  // Maximum trade amount (configurable)
  const MAX_TRADE_AMOUNT = 1000000;
  
  return amount >= MIN_TRADE_AMOUNT && amount <= MAX_TRADE_AMOUNT;
}

/**
 * Validates trade status transition
 */
export function validateTradeStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const allowedTransitions = TRADE_STATUS_TRANSITIONS[currentStatus];
  if (!allowedTransitions) {
    return false;
  }
  return allowedTransitions.includes(newStatus);
}

/**
 * Validates offer status transition
 */
export function validateOfferStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const allowedTransitions = OFFER_STATUS_TRANSITIONS[currentStatus];
  if (!allowedTransitions) {
    return false;
  }
  return allowedTransitions.includes(newStatus);
}

/**
 * Sanitizes user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }
  
  // Remove any HTML tags and escape special characters
  return validator.escape(validator.stripLow(input.trim()));
}

/**
 * Validates and sanitizes message content
 */
export function validateMessage(message: any): string {
  if (!message || typeof message !== "string") {
    throw createError({ 
      statusCode: 400, 
      message: "Message must be a non-empty string" 
    });
  }

  const sanitized = sanitizeInput(message);
  
  // Check message length (configurable)
  const MAX_MESSAGE_LENGTH = 1000;
  if (sanitized.length === 0) {
    throw createError({ 
      statusCode: 400, 
      message: "Message cannot be empty" 
    });
  }
  
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    throw createError({ 
      statusCode: 400, 
      message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters` 
    });
  }

  return sanitized;
}

/**
 * Validates payment method data
 */
export function validatePaymentMethod(data: any): {
  name: string;
  icon: string;
  description?: string;
  instructions?: string;
  processingTime?: string;
} {
  if (!data || typeof data !== "object") {
    throw createError({ 
      statusCode: 400, 
      message: "Invalid payment method data" 
    });
  }

  // Validate name
  if (!data.name || typeof data.name !== "string") {
    throw createError({ 
      statusCode: 400, 
      message: "Payment method name is required" 
    });
  }

  const name = sanitizeInput(data.name);
  if (name.length < 2 || name.length > 50) {
    throw createError({ 
      statusCode: 400, 
      message: "Payment method name must be between 2-50 characters" 
    });
  }

  // Validate icon (allow only predefined icons)
  const allowedIcons = [
    "credit-card", "bank", "wallet", "cash", "bitcoin", 
    "ethereum", "paypal", "venmo", "zelle", "wire-transfer"
  ];
  const icon = data.icon && allowedIcons.includes(data.icon) 
    ? data.icon 
    : "credit-card";

  // Validate optional fields
  const result: any = { name, icon };

  if (data.description) {
    result.description = sanitizeInput(data.description).substring(0, 200);
  }

  if (data.instructions) {
    result.instructions = sanitizeInput(data.instructions).substring(0, 500);
  }

  if (data.processingTime) {
    result.processingTime = sanitizeInput(data.processingTime).substring(0, 50);
  }

  return result;
}

/**
 * Validates trade terms
 */
export function validateTradeTerms(terms: any): string {
  if (!terms || typeof terms !== "string") {
    throw createError({ 
      statusCode: 400, 
      message: "Trade terms are required" 
    });
  }

  const sanitized = sanitizeInput(terms);
  
  if (sanitized.length < 10) {
    throw createError({ 
      statusCode: 400, 
      message: "Trade terms must be at least 10 characters" 
    });
  }

  if (sanitized.length > 1000) {
    throw createError({ 
      statusCode: 400, 
      message: "Trade terms cannot exceed 1000 characters" 
    });
  }

  return sanitized;
}

/**
 * Validates dispute reason
 */
export function validateDisputeReason(reason: any): string {
  const validReasons = [
    "PAYMENT_NOT_RECEIVED",
    "PAYMENT_INCORRECT_AMOUNT",
    "SELLER_UNRESPONSIVE",
    "BUYER_UNRESPONSIVE",
    "FRAUDULENT_ACTIVITY",
    "TERMS_VIOLATION",
    "OTHER"
  ];

  if (!reason || !validReasons.includes(reason)) {
    throw createError({ 
      statusCode: 400, 
      message: "Invalid dispute reason" 
    });
  }

  return reason;
}

/**
 * Validates file upload for dispute evidence
 */
export function validateEvidenceFile(file: any): {
  isValid: boolean;
  error?: string;
} {
  if (!file) {
    return { isValid: false, error: "No file provided" };
  }

  // Check file size (5MB limit)
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: "File size exceeds 5MB limit" };
  }

  // Check file type
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "text/plain"
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return { 
      isValid: false, 
      error: "Invalid file type. Allowed: JPEG, PNG, GIF, PDF, TXT" 
    };
  }

  // Check file extension
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".pdf", ".txt"];
  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
  
  if (!allowedExtensions.includes(ext)) {
    return { isValid: false, error: "Invalid file extension" };
  }

  return { isValid: true };
}

/**
 * Validates location settings
 */
export function validateLocationSettings(data: any): {
  country: string;
  region?: string;
  city?: string;
  restrictions?: string[];
} {
  if (!data || typeof data !== "object") {
    throw createError({ 
      statusCode: 400, 
      message: "Location settings are required" 
    });
  }

  if (!data.country || typeof data.country !== "string") {
    throw createError({ 
      statusCode: 400, 
      message: "Country is required" 
    });
  }

  // Validate country code (ISO 3166-1 alpha-2)
  const country = data.country.toUpperCase();
  if (!validator.isISO31661Alpha2(country)) {
    throw createError({ 
      statusCode: 400, 
      message: "Invalid country code" 
    });
  }

  const result: any = { country };

  if (data.region) {
    result.region = sanitizeInput(data.region).substring(0, 100);
  }

  if (data.city) {
    result.city = sanitizeInput(data.city).substring(0, 100);
  }

  if (data.restrictions && Array.isArray(data.restrictions)) {
    result.restrictions = data.restrictions
      .filter((r: any) => typeof r === "string" && validator.isISO31661Alpha2(r))
      .slice(0, 50); // Max 50 restricted countries
  }

  return result;
}

/**
 * Validates user requirements for offers
 */
export function validateUserRequirements(data: any): {
  minCompletedTrades?: number;
  minSuccessRate?: number;
  minAccountAge?: number;
  trustedOnly?: boolean;
} | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const result: any = {};

  if (typeof data.minCompletedTrades === "number") {
    result.minCompletedTrades = Math.max(0, Math.min(1000, Math.floor(data.minCompletedTrades)));
  }

  if (typeof data.minSuccessRate === "number") {
    result.minSuccessRate = Math.max(0, Math.min(100, data.minSuccessRate));
  }

  if (typeof data.minAccountAge === "number") {
    result.minAccountAge = Math.max(0, Math.min(365, Math.floor(data.minAccountAge)));
  }

  if (typeof data.trustedOnly === "boolean") {
    result.trustedOnly = data.trustedOnly;
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Validates price configuration
 */
export function validatePriceConfig(data: any, marketPrice?: number): {
  model: "FIXED" | "MARGIN";
  value: number;
  marketPrice?: number;
  finalPrice: number;
} {
  if (!data || typeof data !== "object") {
    throw createError({ 
      statusCode: 400, 
      message: "Price configuration is required" 
    });
  }

  if (!["FIXED", "MARGIN"].includes(data.model)) {
    throw createError({ 
      statusCode: 400, 
      message: "Price model must be FIXED or MARGIN" 
    });
  }

  if (typeof data.value !== "number" || data.value <= 0) {
    throw createError({ 
      statusCode: 400, 
      message: "Price value must be a positive number" 
    });
  }

  let finalPrice: number;

  if (data.model === "FIXED") {
    finalPrice = data.value;
  } else {
    // MARGIN model
    if (!marketPrice || marketPrice <= 0) {
      throw createError({ 
        statusCode: 400, 
        message: "Market price is required for margin pricing" 
      });
    }

    // Validate margin percentage (-10% to +10%)
    if (data.value < -10 || data.value > 10) {
      throw createError({ 
        statusCode: 400, 
        message: "Margin must be between -10% and +10%" 
      });
    }

    finalPrice = marketPrice * (1 + data.value / 100);
  }

  return {
    model: data.model,
    value: data.value,
    marketPrice: data.model === "MARGIN" ? marketPrice : undefined,
    finalPrice: parseFloat(finalPrice.toFixed(8)), // 8 decimal places for crypto
  };
}