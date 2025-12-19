import { Heart, Package, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function WishlistEmptyState() {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return (
    <div className={`bg-linear-to-b from-amber-50/30 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 min-h-screen pb-12 pt-24`}>
      {/* Subtle decorative background glows */}
      <div className={`absolute top-20 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none`} />
      <div className={`absolute top-1/2 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none`} />

      <div className="relative container">
        <div className={`text-center bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-700`}>
          <div className="relative py-24">
            <div className="relative z-10">
              <div className={`mx-auto w-24 h-24 bg-linear-to-br from-amber-500/20 to-emerald-500/20 dark:from-amber-600/30 dark:to-emerald-600/30 rounded-full flex items-center justify-center mb-6`}>
                <Heart className={`h-12 w-12 text-amber-600 dark:text-amber-400`} />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-4">
                {tCommon("your_wishlist_is_empty")}
              </h2>
              <p className="text-gray-600 dark:text-zinc-400 max-w-md mx-auto text-lg mb-8">
                {tExt("you_havent_added_any_products_to_your_wishlist_yet_1")} {tExt("browse_our_products_to_add_items_to_your_wishlist")}
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/ecommerce/product">
                  <Button
                    size="lg"
                    className={`bg-linear-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 text-white`}
                  >
                    <Package className="mr-2 h-5 w-5" />
                    {tCommon("browse_products")}
                  </Button>
                </Link>
                <Link href="/ecommerce">
                  <Button
                    variant="outline"
                    size="lg"
                    className={`border border-amber-600/30 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 dark:hover:bg-amber-600/20`}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {tCommon("back_to_home")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
