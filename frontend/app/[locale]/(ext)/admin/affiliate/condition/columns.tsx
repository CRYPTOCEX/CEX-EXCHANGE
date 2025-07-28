import {
  Shield,
  ClipboardList,
  DollarSign,
  Image as ImageIcon,
  CheckSquare,
} from "lucide-react";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique identifier",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "compoundTitle",
    title: "Title & Image",
    type: "compound",
    disablePrefixSort: true,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Public title and image of the condition",
    priority: 1,
    render: {
      type: "compound",
      config: {
        image: {
          key: "image",
          title: "Image",
          type: "image",
          fallback: "/img/placeholder.svg",
          icon: ImageIcon,
          sortable: false,
          searchable: false,
          filterable: false,
          editable: true,
          usedInCreate: true,
          description: "Condition image URL",
        },
        primary: {
          key: "title",
          title: "Title",
          type: "text",
          sortable: true,
          searchable: true,
          filterable: true,
          editable: true,
          usedInCreate: true,
          description: "Public title of the condition",
        },
      },
    },
  },
  {
    key: "type",
    title: "Type",
    type: "select",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Condition type",
    expandedOnly: true,
    options: [
      { value: "DEPOSIT", label: "Deposit" },
      { value: "TRADE", label: "Trade" },
      { value: "BINARY_WIN", label: "Binary Win" },
      { value: "INVESTMENT", label: "Investment" },
      { value: "AI_INVESTMENT", label: "AI Investment" },
      { value: "FOREX_INVESTMENT", label: "Forex Investment" },
      { value: "ICO_CONTRIBUTION", label: "ICO Contribution" },
      { value: "STAKING", label: "Staking" },
      { value: "ECOMMERCE_PURCHASE", label: "Ecommerce Purchase" },
      { value: "P2P_TRADE", label: "P2P Trade" },
    ],
    priority: 1,
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          switch (value) {
            case "DEPOSIT":
              return "success";
            case "TRADE":
              return "danger";
            case "INVESTMENT":
              return "warning";
            case "AI_INVESTMENT":
              return "info";
            case "FOREX_INVESTMENT":
              return "primary";
            case "ICO_CONTRIBUTION":
              return "secondary";
            case "STAKING":
              return "success";
            case "ECOMMERCE_PURCHASE":
              return "danger";
            case "P2P_TRADE":
              return "warning";
            default:
              return "info";
          }
        },
        withDot: false,
      },
    },
  },
  {
    key: "description",
    title: "Brief Description",
    type: "textarea",
    sortable: false,
    searchable: true,
    filterable: false,
    editable: true,
    usedInCreate: true,
    description: "A short description for internal use",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "rewardWalletType",
    title: "Reward Wallet",
    type: "select",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Wallet type for reward",
    // Instead of static options, use an API endpoint:
    apiEndpoint: {
      url: "/api/admin/finance/wallet/options",
      method: "GET",
    },
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          switch (value) {
            case "FIAT":
              return "success";
            case "SPOT":
              return "danger";
            case "ECO":
              return "warning";
            default:
              return "info";
          }
        },
        withDot: false,
      },
    },
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "rewardCurrency",
    title: "Reward Currency",
    type: "select",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Reward currency",
    priority: 3,
    expandedOnly: true,
    dynamicSelect: {
      refreshOn: "rewardWalletType",
      endpointBuilder: (walletTypeValue: string | undefined) =>
        walletTypeValue
          ? {
              url: `/api/admin/finance/currency/options?type=${walletTypeValue}`,
              method: "GET",
            }
          : null,
      disableWhenEmpty: true,
    },
  },
  {
    key: "rewardChain",
    title: "Reward Chain",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Reward chain (if applicable)",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "rewardType",
    title: "Reward Type",
    type: "select",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Reward type",
    options: [
      { value: "PERCENTAGE", label: "Percentage" },
      { value: "FIXED", label: "Fixed" },
    ],
    priority: 1,
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          switch (value) {
            case "PERCENTAGE":
              return "success";
            case "FIXED":
              return "danger";
            default:
              return "info";
          }
        },
        withDot: false,
      },
    },
  },
  {
    key: "reward",
    title: "Reward",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Reward value",
    priority: 1,
  },
  {
    key: "status",
    title: "Status",
    type: "toggle",
    icon: CheckSquare,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Condition status",
    priority: 1,
  },
];
