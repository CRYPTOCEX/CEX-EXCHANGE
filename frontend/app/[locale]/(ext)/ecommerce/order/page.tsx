import AccountClient from "./client";

export const metadata = {
  title: "My Account | E-commerce",
  description: "Manage your account, orders, and wishlist",
};

export default function AccountPage() {
  return (
    <div className="dark:bg-zinc-900 dark:text-zinc-100">
      <AccountClient />
    </div>
  );
}
