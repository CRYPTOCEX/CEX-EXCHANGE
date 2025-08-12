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
  const t = useTranslations("ext");
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
    <div className="bg-primary dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between">
          {/* Back button */}
          <Link
            href="/p2p/offer"
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary-foreground/20 dark:bg-zinc-800/50 text-primary-foreground dark:text-zinc-200 mb-6 hover:bg-primary-foreground/30 dark:hover:bg-zinc-700/50 transition duration-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back_to_offers")}
          </Link>
          {/* Add an edit button for owners */}
          {isOwner && (
            <div className="flex justify-between items-center mb-4">
              <Link
                href={`/p2p/offer/${offer.id}/edit`}
                className="inline-flex items-center px-4 py-2 rounded-md bg-primary-foreground/20 dark:bg-zinc-800/50 text-primary-foreground dark:text-zinc-200 hover:bg-primary-foreground/30 dark:hover:bg-zinc-700/50 transition duration-200"
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
                {t("edit_offer")}
              </Link>
            </div>
          )}
        </div>

        {/* Main header */}
        <div className="flex items-center mb-4">
          <div className="bg-primary-foreground/20 dark:bg-zinc-800/50 p-2 rounded-full mr-3">
            {/* Check if it's a fiat currency (3 letter code like USD, AED, EUR) */}
                            {isValidCurrencyCode(offer.currency) ? (
              <div className="w-8 h-8 flex items-center justify-center text-primary-foreground dark:text-zinc-200 font-bold text-sm bg-primary-foreground/10 dark:bg-zinc-700/50 rounded-full">
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
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground dark:text-zinc-100">
            {actionText} {offer.currency}
          </h1>
          <Badge className="ml-3 bg-primary/80 dark:bg-zinc-700 text-primary-foreground dark:text-zinc-200">
            {offer.status.replace(/_/g, " ")}
          </Badge>
          {/* Add an owner badge near the top of the component, after the status Badge */}
          {isOwner && (
            <Badge className="ml-3 bg-green-600 dark:bg-green-700 text-white">{t("your_offer")}</Badge>
          )}
        </div>

        {/* Info row */}
        <div className="flex flex-wrap items-center text-primary-foreground dark:text-zinc-200 mb-6">
          <div className="flex items-center mr-6 mb-2">
            <DollarSign className="h-4 w-4 mr-1" />
            <span className="font-medium">
              {price.toLocaleString()}{" "}
              USD
            </span>
          </div>

          <div className="flex items-center mr-6 mb-2">
            <Clock className="h-4 w-4 mr-1" />
            <span>
              {timeLimit}{" "}
              {t("min_limit")}
            </span>
          </div>

          <div className="flex items-center mr-6 mb-2">
            <Globe className="h-4 w-4 mr-1" />
            <span>{location || "Global"}</span>
          </div>

          <div className="flex items-center mr-6 mb-2">
            <svg
              className="h-4 w-4 mr-1 text-white"
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
              {t("Wallet")}
            </span>
          </div>

          <div className="flex items-center mb-2">
            <Shield className="h-4 w-4 mr-1" />
            <span>{t("escrow_protected")}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Stats cards */}
          <div className="flex justify-between items-center">
            <div className="bg-primary-foreground/20 dark:bg-zinc-800/50 rounded-lg p-4 w-full">
              <div className="text-sm text-primary-foreground/80 dark:text-zinc-300 mb-1">
                {t("available_amount")}
              </div>
              <div className="text-2xl font-bold text-primary-foreground dark:text-zinc-100">
                {formatAmount(amountConfig.total || 0, offer.currency)}{" "}
                <span className="text-lg">{offer.currency}</span>
              </div>
              <div className="text-xs text-primary-foreground/70 dark:text-zinc-400">
                ≈
                {((amountConfig.total || 0) * price).toFixed(2)}{" "}
                USD
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="bg-primary-foreground/20 dark:bg-zinc-800/50 rounded-lg p-4 w-full">
              <div className="text-sm text-primary-foreground/80 dark:text-zinc-300 mb-1">{t("min_order")}</div>
              <div className="text-2xl font-bold text-primary-foreground dark:text-zinc-100">
                {formatAmount(minBtc, offer.currency)}{" "}
                <span className="text-lg">{offer.currency}</span>
              </div>
              <div className="text-xs text-primary-foreground/70 dark:text-zinc-400">
                ≈
                {amountConfig.min?.toFixed(2) || "0.00"}{" "}
                USD
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="bg-primary-foreground/20 dark:bg-zinc-800/50 rounded-lg p-4 w-full">
              <div className="text-sm text-primary-foreground/80 dark:text-zinc-300 mb-1">{t("max_order")}</div>
              <div className="text-2xl font-bold text-primary-foreground dark:text-zinc-100">
                {formatAmount(maxBtc, offer.currency)}{" "}
                <span className="text-lg">{offer.currency}</span>
              </div>
              <div className="text-xs text-primary-foreground/70 dark:text-zinc-400">
                ≈
                {amountConfig.max?.toFixed(2) || "0.00"}{" "}
                USD
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="bg-primary-foreground/20 dark:bg-zinc-800/50 rounded-lg p-4 w-full">
              <div className="text-sm text-primary-foreground/80 dark:text-zinc-300 mb-1">
                {t("seller_rating")}
              </div>
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-300 mr-1" />
                <span className="text-2xl font-bold text-primary-foreground dark:text-zinc-100">
                  {sellerRating}%
                </span>
              </div>
              <div className="text-xs text-primary-foreground/70 dark:text-zinc-400">
                {completedTrades}{" "}
                {t("completed_trades")}
              </div>
            </div>
          </div>
        </div>

        {/* Status cards */}
        <div className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-primary-foreground/20 dark:bg-zinc-800/50 rounded-lg p-4 flex items-center">
              <Eye className="h-5 w-5 text-primary-foreground/70 dark:text-zinc-400 mr-3" />
              <div>
                <div className="text-xs text-primary-foreground/70 dark:text-zinc-400">{t("Views")}</div>
                <div className="text-lg font-medium text-primary-foreground dark:text-zinc-100">
                  {offer.views || 0}
                </div>
              </div>
            </div>

            <div className="bg-primary-foreground/20 dark:bg-zinc-800/50 rounded-lg p-4 flex items-center">
              <ShoppingCart className="h-5 w-5 text-primary-foreground/70 dark:text-zinc-400 mr-3" />
              <div>
                <div className="text-xs text-primary-foreground/70 dark:text-zinc-400">{t("Completed")}</div>
                <div className="text-lg font-medium text-primary-foreground dark:text-zinc-100">
                  {offer.trades?.length || 0}
                </div>
              </div>
            </div>

            {offer.status === "PENDING_APPROVAL" && (
              <div className="bg-zinc-600/30 dark:bg-zinc-800/50 rounded-lg p-4 flex items-center">
                <Clock className="h-5 w-5 text-zinc-300 dark:text-zinc-400 mr-3" />
                <div>
                  <div className="text-xs text-zinc-300 dark:text-zinc-400">
                    {t("pending_approval")}
                  </div>
                  <div className="text-lg font-medium text-zinc-100 dark:text-zinc-100">
                    {t("awaiting_admin_review")}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pending approval notice */}
          {offer.status === "PENDING_APPROVAL" && (
            <div className="bg-zinc-600/30 dark:bg-zinc-800/50 border border-zinc-500/30 dark:border-zinc-700/50 rounded-lg p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-zinc-100 dark:text-zinc-100">
                  {t("pending_admin_approval")}
                </h3>
                <p className="text-zinc-200 dark:text-zinc-300 text-sm">
                  {t("this_offer_is_currently_under_review_by_our_team")}.{" "}
                  {t("it_will_be_available_for_trading_once_approved")}.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
