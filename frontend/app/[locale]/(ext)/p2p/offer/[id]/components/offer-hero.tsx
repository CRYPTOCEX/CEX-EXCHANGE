import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  DollarSign,
  Eye,
  Globe,
  Shield,
  ShoppingCart,
  Star,
  AlertCircle,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { isValidCurrencyCode, formatAmount } from "@/utils/currency";

// Helper function to parse JSON safely
const safeJsonParse = (jsonString, defaultValue = {}) => {
  try {
    return jsonString ? JSON.parse(jsonString) : defaultValue;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return defaultValue;
  }
};

// Update the OfferHeroProps interface to include isOwner
interface OfferHeroProps {
  offer: any;
  actionText: string;
  timeLimit: number;
  isOwner?: boolean;
}

// Update the function parameters to include isOwner
export function OfferHero({
  offer,
  actionText,
  timeLimit,
  isOwner = false,
}: OfferHeroProps) {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtP2p = useTranslations("ext_p2p");
  if (!offer) return null;

  // Parse JSON strings if they haven't been parsed already
  const amountConfig =
    typeof offer.amountConfig === "string"
      ? safeJsonParse(offer.amountConfig, {})
      : offer.amountConfig || {};

  const priceConfig =
    typeof offer.priceConfig === "string"
      ? safeJsonParse(offer.priceConfig, {})
      : offer.priceConfig || {};

  const tradeSettings =
    typeof offer.tradeSettings === "string"
      ? safeJsonParse(offer.tradeSettings, {})
      : offer.tradeSettings || {};

  const locationSettings =
    typeof offer.locationSettings === "string"
      ? safeJsonParse(offer.locationSettings, {})
      : offer.locationSettings || {};

  // Format location
  const location = [
    locationSettings.city,
    locationSettings.region,
    locationSettings.country,
  ]
    .filter(Boolean)
    .join(", ");

  // Calculate min/max BTC amounts
  const price = priceConfig.finalPrice || priceConfig.value || 0;
  const minBtc = price ? amountConfig.min / price : 0;
  const maxBtc = price ? amountConfig.max / price : 0;

  // Calculate seller rating and display the correct completion rate
  const sellerRating = offer.user?.stats?.completionRate || 0;
  const completedTrades = offer.user?.stats?.totalTrades || 0;

  return (
    <section className="relative pt-24 pb-12 overflow-hidden border-b border-zinc-200/50 dark:border-zinc-800/50">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: "#3b82f6" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-15"
          style={{ backgroundColor: "#8b5cf6" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: "#6366f1" }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex justify-between mb-6">
          {/* Back button */}
          <Link
            href="/p2p/offer"
            className={`inline-flex items-center px-4 py-2 rounded-xl bg-blue-500/10 text-zinc-700 dark:text-zinc-200 hover:bg-blue-500/20 transition duration-200`}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tCommon('back_to_offerings')}
          </Link>
          {/* Add an edit button for owners */}
          {isOwner && (
            <Link
              href={`/p2p/offer/${offer.id}/edit`}
              className={`inline-flex items-center px-4 py-2 rounded-xl bg-blue-500/10 text-zinc-700 dark:text-zinc-200 hover:bg-blue-500/20 transition duration-200`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              {tCommon("edit_offer")}
            </Link>
          )}
        </div>

        {/* Main header */}
        <div className="flex items-center mb-4">
          <div className={`bg-blue-500/20 p-2 rounded-full mr-3`}>
            {/* Check if it's a fiat currency (3 letter code like USD, AED, EUR) */}
            {isValidCurrencyCode(offer.currency) ? (
              <div className={`w-8 h-8 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm bg-blue-500/10 rounded-full`}>
                {offer.currency}
              </div>
            ) : (
              <Image
                src={`/img/crypto/${(offer.currency || "generic").toLowerCase()}.webp`}
                alt={`Logo of ${offer.currency || "generic"}`}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">
            <span className="bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
              {actionText}
            </span>{" "}
            <span className={`bg-gradient-to-r from-blue-600 via-violet-500 to-blue-600 bg-clip-text text-transparent`}>
              {offer.currency}
            </span>
          </h1>
          <Badge className={`ml-3 bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20`}>
            {offer.status.replace(/_/g, " ")}
          </Badge>
          {/* Add an owner badge near the top of the component, after the status Badge */}
          {isOwner && (
            <Badge className="ml-3 bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/20">{tExtP2p("your_offer")}</Badge>
          )}
        </div>

        {/* Info row */}
        <div className="flex flex-wrap items-center text-zinc-600 dark:text-zinc-400 mb-6 gap-6">
          <div className="flex items-center">
            <DollarSign className={`h-4 w-4 mr-1 text-blue-500`} />
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {price.toLocaleString()}{" "}
              {offer.priceCurrency || priceConfig.currency || "USD"}
            </span>
          </div>

          <div className="flex items-center">
            <Clock className={`h-4 w-4 mr-1 text-blue-500`} />
            <span>
              {timeLimit}{" "}
              {tExtP2p("min_limit")}
            </span>
          </div>

          <div className="flex items-center">
            <Globe className={`h-4 w-4 mr-1 text-blue-500`} />
            <span>{location || "Global"}</span>
          </div>

          <div className="flex items-center">
            <svg
              className={`h-4 w-4 mr-1 text-blue-500`}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="6"
                width="18"
                height="15"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M4 11H20" stroke="currentColor" strokeWidth="2" />
              <path d="M9 16H15" stroke="currentColor" strokeWidth="2" />
              <path
                d="M8 3L8 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M16 3L16 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>
              {offer.walletType}{" "}
              {tCommon("wallet")}
            </span>
          </div>

          <div className="flex items-center">
            <Shield className={`h-4 w-4 mr-1 text-blue-500`} />
            <span>{tExtP2p("escrow_protected")}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Stats cards */}
          <div className="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200/50 dark:border-zinc-700/50">
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
              {tExt("available_amount")}
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatAmount(amountConfig.total || 0, offer.currency)}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              ≈{((amountConfig.total || 0) * price).toFixed(2)}{" "}
              {offer.priceCurrency || priceConfig.currency || "USD"}
            </div>
          </div>

          <div className="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200/50 dark:border-zinc-700/50">
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">{tExtP2p("min_order")}</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatAmount(minBtc, offer.currency)}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              ≈{amountConfig.min?.toFixed(2) || "0.00"}{" "}
              {offer.priceCurrency || priceConfig.currency || "USD"}
            </div>
          </div>

          <div className="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200/50 dark:border-zinc-700/50">
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">{tExtP2p("max_order")}</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatAmount(maxBtc, offer.currency)}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              ≈{amountConfig.max?.toFixed(2) || "0.00"}{" "}
              {offer.priceCurrency || priceConfig.currency || "USD"}
            </div>
          </div>

          <div className="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200/50 dark:border-zinc-700/50">
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
              {tExtP2p("seller_rating")}
            </div>
            <div className="flex items-center">
              <Star className="h-5 w-5 text-yellow-500 mr-1" />
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {sellerRating}%
              </span>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {completedTrades}{" "}
              {tExt("completed_trades")}
            </div>
          </div>
        </div>

        {/* Status cards */}
        <div className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl p-4 flex items-center border border-zinc-200/50 dark:border-zinc-700/50">
              <div className={`h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mr-3`}>
                <Eye className={`h-5 w-5 text-blue-500`} />
              </div>
              <div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{tExt("views")}</div>
                <div className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  {offer.views || 0}
                </div>
              </div>
            </div>

            <div className="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl p-4 flex items-center border border-zinc-200/50 dark:border-zinc-700/50">
              <div className={`h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mr-3`}>
                <ShoppingCart className={`h-5 w-5 text-blue-500`} />
              </div>
              <div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{tCommon("completed")}</div>
                <div className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  {offer.trades?.length || 0}
                </div>
              </div>
            </div>

            {offer.status === "PENDING_APPROVAL" && (
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 flex items-center border border-amber-200/50 dark:border-amber-700/50">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mr-3">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    {tExt("pending_approval")}
                  </div>
                  <div className="text-lg font-medium text-amber-700 dark:text-amber-300">
                    {tExtP2p("awaiting_admin_review")}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pending approval notice */}
          {offer.status === "PENDING_APPROVAL" && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-700/50 rounded-xl p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-3 shrink-0" />
              <div>
                <h3 className="font-medium text-amber-700 dark:text-amber-300">
                  {tExtP2p("pending_admin_approval")}
                </h3>
                <p className="text-amber-600 dark:text-amber-400 text-sm">
                  {tExtP2p("this_offer_is_currently_under_review_by_our_team")}.{" "}
                  {tExtP2p("it_will_be_available_for_trading_once_approved")}.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
