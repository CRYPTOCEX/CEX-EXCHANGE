import Stripe from "stripe";
const stripeApiKey = process.env.APP_STRIPE_SECRET_KEY;
export const useStripe = () => {
  if (!stripeApiKey) {
    throw new Error("Stripe API key is not set in environment variables.");
  }
  return new Stripe(stripeApiKey);
};
