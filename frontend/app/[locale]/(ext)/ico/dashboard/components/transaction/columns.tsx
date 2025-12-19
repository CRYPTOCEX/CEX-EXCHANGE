"use client";
import {
  CalendarIcon,
  DollarSign,
  ClipboardCheck,
  CheckCircle,
  FileText,
  Wallet as WalletIcon,
  Coins,
  ExternalLink,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { Icon } from "@iconify/react";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("ext_ico");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return [
  {
    key: "offering.name",
    title: tExt("offering"),
    sortKey: "offering.name",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: FileText,
    priority: 1,
    description: t("name_of_the_ico_offering_you_participated_in"),
  },
  {
    key: "amount",
    title: tCommon("amount"),
    type: "number",
    icon: Coins,
    sortable: true,
    searchable: true,
    filterable: true,
    priority: 1,
    description: t("total_number_of_tokens_you_purchased"),
  },
  {
    key: "price",
    title: tExtAdmin("price_per_token"),
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    priority: 2,
    description: t("price_you_paid_per_token_in_usd"),
  },
  {
    key: "status",
    title: tCommon("status"),
    type: "select",
    icon: CheckCircle,
    sortable: true,
    searchable: true,
    filterable: true,
    priority: 1,
    description: t("current_processing_status_of_your_token_purchase"),
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value.toUpperCase()) {
            case "RELEASED":
              return "success";
            case "PENDING":
              return "warning";
            case "VERIFICATION":
              return "info";
            case "REJECTED":
              return "destructive";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      { value: "PENDING", label: tCommon("pending") },
      { value: "VERIFICATION", label: tExt("verification") },
      { value: "RELEASED", label: tCommon("released") },
      { value: "REJECTED", label: tCommon("rejected") },
    ],
  },
  {
    key: "createdAt",
    title: t("purchase_date"),
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    priority: 2,
    description: t("date_and_time_when_you_made_this_purchase"),
    render: {
      type: "date",
      format: "PPP",
    },
  },
  {
    key: "releaseUrl",
    title: t("release_document"),
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: ExternalLink,
    priority: 3,
    description: t("link_to_your_token_release_document"),
    render: {
      type: "custom",
      render: (value: string) => {
        if (!value) {
          return <span className="text-muted-foreground">N/A</span>;
        }
        return (
          <Link
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-500 hover:underline transition-colors duration-200"
            aria-label={t("view_release_document")}
          >
            <Icon icon="fa-solid:external-link-alt" />
            {(() => {
              try {
                const domain = new URL(value).hostname;
                const name = domain.replace(/^www\./, "").split(".")[0];
                return name.charAt(0).toUpperCase() + name.slice(1);
              } catch (e) {
                return "N/A";
              }
            })()}
          </Link>
        );
      },
    },
  },
  {
    key: "walletAddress",
    title: tCommon("wallet_address"),
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: WalletIcon,
    description: t("your_cryptocurrency_wallet_address_used_for"),
    expandedOnly: true,
  },
  {
    key: "id",
    title: tCommon("transaction_id"),
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: ClipboardCheck,
    description: tCommon("unique_identifier_for_your_transaction_record"),
    expandedOnly: true,
  },
] as ColumnDefinition[];
}
