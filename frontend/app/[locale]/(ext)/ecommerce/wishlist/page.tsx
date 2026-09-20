import WishlistClient from "./client";

export const metadata = {
  title: "My Wishlist | E-commerce",
  description: "View and manage your wishlist items",
};

export default function WishlistPage() {
  return (
    <div className="bg-white dark:bg-black dark:text-zinc-100">
      <WishlistClient />
    </div>
  );
}
