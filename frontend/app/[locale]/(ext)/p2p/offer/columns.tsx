import React from "react";
import {
  User,
  // seller
  DollarSign,
  // price
  Coins,
  // available
  CreditCard,
  // payment methods
  Tag,
  // type
  ShieldCheck,
  // kyc
  Clock,
  // auto-cancel
  MapPin,
  // location
  Calendar,
  // created date
  Eye, // views
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
export const columns: ColumnDefinition[] = [
  // Location
  {
    key: "location",
    title: "Location",
    type: "custom",
    icon: MapPin,
    searchable: true,
    filterable: true,
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
    title: "Seller",
    type: "custom",
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
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
    title: "Type",
    type: "custom",
    icon: Tag,
    sortable: true,
    filterable: true,
    render: {
      type: "custom",
      render: (_: any, offer: any) => (
        <Badge variant={offer.type === "BUY" ? "success" : "destructive"}>
          {offer.type}
        </Badge>
      ),
    },
  },
  // Price (USD)
  {
    key: "priceConfig",
    title: "Price (USD)",
    type: "custom",
    icon: DollarSign,
    sortable: false, // Can't sort on JSON field
    filterable: false,
    render: {
      type: "custom",
      render: (_: any, offer: any) => {
        // parse if it's a string
        const cfg =
          typeof offer.priceConfig === "string"
            ? JSON.parse(offer.priceConfig)
            : offer.priceConfig;
        const price = cfg?.finalPrice ?? 0;
        return <div>{price.toLocaleString()} USD</div>;
      },
    },
  },
  // Available Amount
  {
    key: "available",
    title: "Available",
    type: "custom",
    icon: Coins,
    filterable: true,
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
        return (
          <div>
            <p className="font-medium">
              {total} {offer.currency}
            </p>
            <p className="text-sm text-muted-foreground">
              ≈ {fiat.toLocaleString()} USD
            </p>
          </div>
        );
      },
    },
  },
  // Limits (min / max)
  {
    key: "limits",
    title: "Limits",
    type: "custom",
    icon: Clock,
    description: "Min and Max trade size",
    render: {
      type: "custom",
      render: (_: any, offer: any) => {
        const amt =
          typeof offer.amountConfig === "string"
            ? JSON.parse(offer.amountConfig)
            : offer.amountConfig;
        return (
          <div className="flex flex-col gap-1">
            <span>Min: {amt?.min ?? "-"} </span>
            <span>Max: {amt?.max ?? "-"}</span>
          </div>
        );
      },
    },
  },
  // Payment Methods
  {
    key: "paymentMethods",
    title: "Payment Methods",
    type: "custom",
    icon: CreditCard,
    render: {
      type: "custom",
      render: (_: any, offer: any) => {
        return (
          <div className="flex flex-wrap gap-1 mt-1">
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
];
