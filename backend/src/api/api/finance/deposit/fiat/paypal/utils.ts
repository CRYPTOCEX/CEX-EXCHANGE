import { Client, Environment, OrdersController } from "@paypal/paypal-server-sdk";

function getEnvironment(): Environment {
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
export function paypalClient(): Client {
  return new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: getClientId(),
      oAuthClientSecret: getClientSecret(),
    },
    environment: getEnvironment(),
  });
}

// Initialize the PayPal Orders Controller
export function paypalOrdersController(): OrdersController {
  const client = paypalClient();
  return new OrdersController(client);
}
