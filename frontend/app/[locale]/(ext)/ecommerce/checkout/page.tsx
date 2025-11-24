import CheckoutClient from "./client";

export const metadata = {
  title: "Checkout | E-commerce",
  description: "Complete your purchase",
};

export default function CheckoutPage() {
  return (
    <div className="dark:bg-zinc-900 dark:text-zinc-100">
      <CheckoutClient />
    </div>
  );
}
