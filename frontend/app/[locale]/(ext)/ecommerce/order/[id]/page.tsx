import OrderClient from "./client";

export const metadata = {
  title: "Order Details | E-commerce",
  description: "View your order details and track your shipment",
};

export default function OrderPage() {
  return <OrderClient />;
}
