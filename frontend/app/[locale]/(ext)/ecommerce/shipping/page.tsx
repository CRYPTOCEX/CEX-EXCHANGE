import ShippingClient from "./client";

export const metadata = {
  title: "Shipping & Delivery | E-commerce",
  description: "Manage shipping and delivery options for your orders",
};

export default function ShippingPage() {
  return (
    <div className="dark:bg-zinc-900 dark:text-zinc-100">
      <ShippingClient />
    </div>
  );
}
