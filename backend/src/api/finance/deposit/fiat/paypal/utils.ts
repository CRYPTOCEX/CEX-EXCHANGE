// @ts-ignore - PayPal SDK types issue
// import { Client, Environment, OrdersController } from "@paypal/paypal-server-sdk";
const paypalSdk = require("@paypal/paypal-server-sdk");
const { Client, Environment, OrdersController } = paypalSdk;

function getEnvironment(): any {
  const isProduction = process.env.NODE_ENV === "production";
  return isProduction ? Environment.Production : Environment.Sandbox;
}

function getClientId(): string {
  return process.env.NEXT_PUBLIC_APP_PAYPAL_CLIENT_ID || "";
}

function getClientSecret(): string {
  return process.env.APP_PAYPAL_CLIENT_SECRET || "";
}

// Initialize the PayPal SDK client
export function paypalClient(): any {
  return new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: getClientId(),
      oAuthClientSecret: getClientSecret(),
    },
    environment: getEnvironment(),
  });
}

// Initialize the PayPal Orders Controller
export function paypalOrdersController(): any {
  const client = paypalClient();
  return new OrdersController(client);
}
