"use client";

import { useState, useEffect, useRef } from "react";
import { ShoppingCart, Search, Heart, Trash2 } from "lucide-react";
import { useEcommerceStore } from "@/store/ecommerce/ecommerce";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function EcommerceHeaderControls() {
  const t = useTranslations("ext_ecommerce");
  const tCommon = useTranslations("common");
  const router = useRouter();

  // Cart state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { cart, removeFromCart, wishlist } = useEcommerceStore();
  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
  const wishlistItemsCount = wishlist.length;
  const cartTotal = cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Ref for cart dropdown to detect outside clicks
  const cartDropdownRef = useRef<HTMLDivElement>(null);

  // Close cart dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cartDropdownRef.current &&
        !cartDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCartOpen(false);
      }
    };

    if (isCartOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCartOpen]);

  // Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/ecommerce/product?search=${searchQuery}`);
    setIsSearchOpen(false);
  };

  // Search overlay
  const searchOverlay = isSearchOpen && (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center pt-20 px-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
            {tCommon("search_products")}
          </h3>
          <button
            onClick={() => setIsSearchOpen(false)}
            className="text-gray-400 dark:text-zinc-400 hover:text-gray-500 dark:hover:text-zinc-300"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 18L18 6M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search_for_products_ellipsis")}
              className="w-full border-gray-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 pl-10 pr-4 py-2"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className={`inline-flex items-center px-8 py-2.5 border border-transparent text-sm font-semibold rounded-xl shadow-md text-white bg-linear-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all duration-200`}
            >
              Search
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex items-center space-x-2">
        {/* Search button */}
        <button
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className="p-2 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
        >
          <Search className="h-6 w-6" />
        </button>

        {/* Wishlist link */}
        <Link
          href="/ecommerce/wishlist"
          className="p-2 rounded-full text-gray-400 hover:text-gray-500 relative"
        >
          <Heart className="h-6 w-6" />
          {wishlistItemsCount > 0 && (
            <span
              className={`absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform bg-linear-to-r from-amber-600 to-emerald-600 rounded-full shadow-lg`}
            >
              {wishlistItemsCount}
            </span>
          )}
        </Link>

        {/* Cart dropdown */}
        <div className="relative cart-dropdown" ref={cartDropdownRef}>
          <button
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="p-2 rounded-full text-gray-400 hover:text-gray-500 relative"
          >
            <ShoppingCart className="h-6 w-6" />
            {cartItemsCount > 0 && (
              <span
                className={`absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform bg-linear-to-r from-amber-600 to-emerald-600 rounded-full shadow-lg`}
              >
                {cartItemsCount}
              </span>
            )}
          </button>
          {isCartOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 rounded-md shadow-lg py-2 z-10 cart-dropdown">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-zinc-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                  {t("shopping_cart")}
                  {cartItemsCount})
                </h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 dark:text-zinc-500" />
                    <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                      {t("your_cart_is_empty")}
                    </p>
                  </div>
                ) : (
                  <div>
                    {cart.map((item) => {
                      return (
                        <div
                          key={item.product.id}
                          className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center"
                        >
                          <div className="flex-shrink-0 w-16 h-16 relative rounded overflow-hidden">
                            <Image
                              src={item.product.image || "/placeholder.svg"}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-zinc-100 truncate">
                              {item.product.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">
                              {item.quantity} x {item.product.price}{" "}
                              {item.product.currency}
                            </p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {cart.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-zinc-700">
                  <div className="flex justify-between text-sm font-medium">
                    <p className="text-gray-700 dark:text-zinc-300">Subtotal</p>
                    <p className="text-gray-900 dark:text-zinc-100">
                      {cartTotal.toFixed(2)} USD
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                      href="/ecommerce/cart"
                      className="text-center px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                      onClick={() => setIsCartOpen(false)}
                    >
                      {t("view_cart")}
                    </Link>
                    <Link
                      href="/ecommerce/checkout"
                      className={`text-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-linear-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 transition-all shadow-md`}
                      onClick={() => setIsCartOpen(false)}
                    >
                      Checkout
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search overlay portal */}
      {searchOverlay}
    </>
  );
}
