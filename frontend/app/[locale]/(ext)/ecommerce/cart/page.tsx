import CartClient from "./client";

export const metadata = {
  title: "Shopping Cart | E-commerce",
  description: "View and manage your shopping cart",
};

export default function CartPage() {
  return (
    <div className="dark:bg-zinc-900 dark:text-zinc-100">
      <CartClient />
    </div>
  );
}
