"use client";
import React from "react";
import { useTranslations } from "next-intl";
import {
  User,
  DollarSign,
  Coins,
  CreditCard,
  Tag,
  MapPin,
  ArrowLeftRight,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function useColumns() {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
  // Location
  {
    key: "location",
    title: tCommon("location"),
    type: "custom",
    icon: MapPin,
    sortable: false,
    searchable: true,
    filterable: true,
    description: t("country_and_region_where_the_offer_is_available"),
    priority: 2,
    render: {
      type: "custom",
      render: (_: any, offer: any) => {
        const loc =
          typeof offer.locationSettings === "string"
            ? JSON.parse(offer.locationSettings)
            : offer.locationSettings;
        return (
          <div className="flex items-center gap-2">
            <img
              className="rounded-sm h-8"
              src={`/img/flag/${loc?.country?.toLowerCase()}.webp`}
              alt={loc?.country}
              title={loc?.country}
            />
            <div className="text-sm text-muted-foreground flex flex-col">
              <span>{loc?.country}</span>
              <span>{loc?.region}</span>
            </div>
          </div>
        );
      },
    },
  },
  // Seller
  {
    key: "seller",
    title: tCommon("seller"),
    type: "custom",
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("user_offering_to_buy_or_sell_cryptocurrency"),
    priority: 1,
    render: {
      type: "custom",
      render: (_: any, offer: any) => (
        <div className="flex items-center">
          <Avatar className="h-10 w-10 mr-3">
            <AvatarImage
              src={offer.user?.avatar ?? "/placeholder.svg"}
              alt={`${offer.user?.firstName ?? ""} ${offer.user?.lastName ?? ""}`}
            />
            <AvatarFallback>
              {(
                `${offer.user?.firstName ?? ""}`.charAt(0) +
                `${offer.user?.lastName ?? ""}`.charAt(0)
              ).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {offer.user?.firstName} {offer.user?.lastName}
            </p>
          </div>
        </div>
      ),
    },
  },
  // Type (BUY / SELL)
  {
    key: "type",
    title: tCommon("type"),
    type: "select",
    icon: ArrowLeftRight,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("trade_type_buy_seller_wants_to"),
    priority: 1,
    render: {
      type: "badge",
      config: {
        withDot: false,
        variant: (value: string) =>
          value?.toUpperCase() === "BUY" ? "success" : "warning",
      },
    },
    options: [
      { value: "BUY", label: tCommon("buy") },
      { value: "SELL", label: tCommon("sell") },
    ],
  },
  // Price
  {
    key: "priceConfig",
    title: tCommon("price"),
    type: "custom",
    icon: DollarSign,
    sortable: false,
    searchable: false,
    filterable: false,
    description: tExt("price_per_unit_of_cryptocurrency_in_fiat_currency"),
    priority: 1,
    render: {
      type: "custom",
      render: (_: any, offer: any) => {
        const cfg =
          typeof offer.priceConfig === "string"
            ? JSON.parse(offer.priceConfig)
            : offer.priceConfig;
        const price = cfg?.finalPrice ?? 0;
        const priceCurrency = offer.priceCurrency || cfg?.currency || "USD";
        const model = cfg?.model || "FIXED";
        return (
          <div className="text-sm">
            <div className="font-medium">
              {price.toLocaleString()} {priceCurrency}
            </div>
            {model && (
              <div className="text-xs text-muted-foreground">{model}</div>
            )}
          </div>
        );
      },
    },
  },
  // Available Amount
  {
    key: "available",
    title: tCommon("available"),
    type: "custom",
    icon: Coins,
    sortable: false,
    searchable: false,
    filterable: true,
    description: t("available_cryptocurrency_amount_and_its_fiat_value"),
    priority: 1,
    render: {
      type: "custom",
      render: (_: any, offer: any) => {
        const amt =
          typeof offer.amountConfig === "string"
            ? JSON.parse(offer.amountConfig)
            : offer.amountConfig;
        const total = parseFloat((amt?.total ?? 0).toFixed(8));
        const cfg =
          typeof offer.priceConfig === "string"
            ? JSON.parse(offer.priceConfig)
            : offer.priceConfig;
        const price = cfg?.finalPrice ?? 0;
        const fiat = total * price;
        const priceCurrency = offer.priceCurrency || cfg?.currency || "USD";
        return (
          <div>
            <p className="font-medium">
              {total} {offer.currency}
            </p>
            <p className="text-sm text-muted-foreground">
              ≈ {fiat.toLocaleString()} {priceCurrency}
            </p>
          </div>
        );
      },
    },
  },
  // Limits (min / max)
  {
    key: "limits",
    title: tCommon("limits"),
    type: "custom",
    icon: TrendingUp,
    sortable: false,
    searchable: false,
    filterable: false,
    description: t("minimum_and_maximum_trade_size_allowed"),
    priority: 2,
    render: {
      type: "custom",
      render: (_: any, offer: any) => {
        const amt =
          typeof offer.amountConfig === "string"
            ? JSON.parse(offer.amountConfig)
            : offer.amountConfig;
        return (
          <div className="flex flex-col gap-1 text-sm">
            <span>{tCommon("min")} {amt?.min ?? "-"}</span>
            <span>{tCommon("max")} {amt?.max ?? "-"}</span>
          </div>
        );
      },
    },
  },
  // Payment Methods
  {
    key: "paymentMethods",
    title: tExt("payment_methods"),
    type: "custom",
    icon: CreditCard,
    sortable: false,
    searchable: false,
    filterable: false,
    description: tExt("accepted_payment_methods_for_this_offer"),
    priority: 3,
    expandedOnly: true,
    render: {
      type: "custom",
      render: (_: any, offer: any) => {
        if (!offer.paymentMethods || offer.paymentMethods.length === 0) {
          return <span className="text-muted-foreground">{tExt("no_methods")}</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {offer.paymentMethods?.slice(0, 2).map((m: any) => (
              <Badge key={m.id} variant="outline" className="font-normal">
                {m.name}
              </Badge>
            ))}
            {offer.paymentMethods?.length > 2 && (
              <Badge variant="outline" className="font-normal">
                +{offer.paymentMethods.length - 2} more
              </Badge>
            )}
          </div>
        );
      },
    },
  },
] as ColumnDefinition[];
}
