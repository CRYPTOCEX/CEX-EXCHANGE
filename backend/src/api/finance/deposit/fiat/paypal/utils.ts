import {
  core as PayPalCore,
  orders as PayPalOrders,
} from "@paypal/checkout-server-sdk";

function environment() {
  const clientId = process.env.NEXT_PUBLIC_APP_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.APP_PAYPAL_CLIENT_SECRET;

  if (process.env.NODE_ENV === "production") {
    return new PayPalCore.LiveEnvironment(clientId, clientSecret);
  } else {
    return new PayPalCore.SandboxEnvironment(clientId, clientSecret);
  }
}

export function paypalClient() {
  return new PayPalCore.PayPalHttpClient(environment());
}

// Directly export PayPalOrders for ease of use
export { PayPalOrders as paypalOrders };
