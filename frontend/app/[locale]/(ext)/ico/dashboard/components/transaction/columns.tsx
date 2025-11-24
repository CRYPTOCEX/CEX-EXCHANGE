import {
  CalendarIcon,
  DollarSign,
  ClipboardCheck,
  Clock,
  FileText,
  Wallet as WalletIcon,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: ClipboardCheck,
    description: "Unique identifier for the transaction",
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "offering.name",
    title: "Offering",
    sortKey: "offering.name",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: FileText,
    description: "Name of the ICO offering",
  },
  {
    key: "walletAddress",
    title: "Wallet Address",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: WalletIcon,
    description: "Wallet address used for the transaction",
    expandedOnly: true,
  },
  {
    key: "amount",
    title: "Amount",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Number of tokens purchased",
  },
  {
    key: "price",
    title: "Price",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Price per token at purchase",
  },
  {
    key: "releaseUrl",
    title: "Release URL",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: FileText,
    description: "URL of the release document",
    render: {
      type: "custom",
      render: (value: string) => {
        const t = useTranslations("ext");
        if (!value) {
          return <span className="text-muted-foreground">{t("N_A")}</span>;
        }
        return (
          <Link
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-500 hover:underline transition-colors duration-200"
            aria-label="View release document"
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
    key: "status",
    title: "Status",
    type: "select",
    icon: Clock,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Transaction status",
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value.toUpperCase()) {
            case "PENDING":
              return "warning";
            case "VERIFICATION":
              return "info";
            case "RELEASED":
              return "success";
            case "REJECTED":
              return "destructive";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      { value: "PENDING", label: "Pending" },
      { value: "VERIFICATION", label: "Verification" },
      { value: "RELEASED", label: "Released" },
      { value: "REJECTED", label: "Rejected" },
    ],
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Date when the transaction was created",
    render: {
      type: "date",
      format: "PPP",
    },
    priority: 3,
  },
];
