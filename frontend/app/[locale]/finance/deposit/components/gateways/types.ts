export type GatewayType = "redirect" | "popup" | "sdk" | "inline-sdk" | "form-post" | "manual";

export interface GatewayComponentProps {
  amount: number;
  currency: string;
  method: any;
  onSuccess: (deposit: DepositResult) => void;
  onError: (error: string) => void;
  onCancel: () => void;
  onProcessing: (active: boolean) => void;
}

export interface DepositResult {
  confirmed: boolean;
  status: string;
  id: string;
  amount: number;
  currency: string;
  method: string;
  transactionHash?: string;
  referenceId?: string;
  balance?: number;
  transaction?: any;
  fee?: number;
  description?: string;
}

export interface RedirectGatewayConfig {
  alias: string;
  displayName: string;
  urlFields: string[];
  paymentIdFields: string[];
  verifyParamName: string;
  verifyMethod?: "GET" | "POST";
  /** Additional fields to extract from initiate response and include in verify request */
  extraVerifyFields?: { responseField: string; verifyParam: string }[];
}

export const REDIRECT_GATEWAY_CONFIGS: Record<string, RedirectGatewayConfig> = {
  "2checkout": {
    alias: "2checkout",
    displayName: "2Checkout",
    urlFields: ["checkoutUrl"],
    paymentIdFields: ["orderReference"],
    verifyParamName: "orderReference",
    extraVerifyFields: [
      // Backend verify expects { orderReference, refNo }
      // Initiate returns { sessionId: result.RefNo || result.OrderNo }
      { responseField: "sessionId", verifyParam: "refNo" },
    ],
  },
  mollie: {
    alias: "mollie",
    displayName: "Mollie",
    urlFields: ["data.checkoutUrl", "checkoutUrl"],
    // Backend verify expects body.transaction = internal transaction ID
    // Initiate returns { data: { transactionId, paymentId, checkoutUrl } }
    paymentIdFields: ["data.transactionId", "transactionId"],
    verifyParamName: "transaction",
  },
  paystack: {
    alias: "paystack",
    displayName: "Paystack",
    urlFields: ["data.authorization_url", "authorization_url"],
    // Backend verify expects { reference } only — access_code is not used
    paymentIdFields: ["data.reference", "reference"],
    verifyParamName: "reference",
  },
  paysafe: {
    alias: "paysafe",
    displayName: "Paysafe",
    urlFields: ["data.checkout_url", "checkout_url"],
    paymentIdFields: ["data.payment_handle_token", "payment_handle_token"],
    verifyParamName: "payment_handle_token",
    // Backend verify expects { payment_handle_token, reference }
    // Initiate returns { data: { payment_handle_token, reference, ... } }
    extraVerifyFields: [
      { responseField: "data.reference", verifyParam: "reference" },
      { responseField: "reference", verifyParam: "reference" },
    ],
  },
  dlocal: {
    alias: "dlocal",
    displayName: "dLocal",
    urlFields: ["redirect_url", "payment_url", "data.redirect_url", "data.payment_url"],
    // Backend verify expects { payment_id, order_id }
    // Initiate returns { id (= dLocal payment ID), order_id, redirect_url, ... }
    paymentIdFields: ["id", "data.id"],
    verifyParamName: "payment_id",
    extraVerifyFields: [
      { responseField: "order_id", verifyParam: "order_id" },
      { responseField: "data.order_id", verifyParam: "order_id" },
    ],
  },
  transfi: {
    alias: "transfi",
    displayName: "TransFi",
    // Initiate returns { success, data: { checkout_url, order_id, transaction_id } }.
    // `checkout_url` carries TransFi's `data.payUrl` — the hosted checkout page.
    urlFields: ["data.checkout_url", "checkout_url"],
    paymentIdFields: ["data.order_id", "order_id"],
    verifyParamName: "order_id",
    // Verify accepts either reference, but sending the platform transaction id
    // too lets the backend find the row without scanning metadata (which is TEXT
    // with no getter, so it cannot be a WHERE clause).
    extraVerifyFields: [
      { responseField: "data.transaction_id", verifyParam: "transaction_id" },
      { responseField: "transaction_id", verifyParam: "transaction_id" },
    ],
  },
  eway: {
    alias: "eway",
    displayName: "eWay",
    urlFields: ["data.payment_url", "payment_url"],
    // Backend verify expects { access_code, transaction_id, reference }
    // Initiate returns { data: { access_code, transaction_id, reference, payment_url } }
    paymentIdFields: ["data.access_code", "access_code"],
    verifyParamName: "access_code",
    extraVerifyFields: [
      { responseField: "data.transaction_id", verifyParam: "transaction_id" },
      { responseField: "transaction_id", verifyParam: "transaction_id" },
      { responseField: "data.reference", verifyParam: "reference" },
      { responseField: "reference", verifyParam: "reference" },
    ],
  },
};
