import {
  Shield,
  ClipboardList,
  Image as ImageIcon,
  CheckSquare,
  DollarSign,
} from "lucide-react";

export const columns: ColumnDefinition[] = [
  // Hidden by default
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique product identifier",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "product",
    title: "Product",
    disablePrefixSort: true,
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Product details",
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
          description: "Product image URL",
        },
        primary: {
          key: "name",
          title: "Name",
          type: "text",
          sortable: true,
          searchable: true,
          filterable: true,
          editable: true,
          usedInCreate: true,
          description: "Product name",
        },
        secondary: {
          key: "slug",
          title: "Slug",
          type: "text",
          sortable: true,
          searchable: true,
          filterable: true,
          editable: true,
          usedInCreate: true,
          description: "URL-friendly slug",
        },
      },
    },
  },
  {
    key: "category",
    title: "Category",
    sortKey: "category.name",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Category details",
    render: {
      type: "custom",
      render(data) {
        return data?.name;
      },
    },
  },
  {
    key: "categoryId",
    title: "Category",
    type: "select",
    sortable: false,
    searchable: false,
    filterable: false,
    editable: true,
    usedInCreate: true,
    description: "Product category",
    apiEndpoint: {
      url: "/api/admin/ecommerce/category/options",
      method: "GET",
    },
    priority: 1,
  },
  {
    key: "description",
    title: "Description",
    type: "textarea",
    sortable: false,
    searchable: true,
    filterable: false,
    editable: true,
    usedInCreate: true,
    description: "Long product description",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "shortDescription",
    title: "Short Desc",
    type: "text",
    sortable: false,
    searchable: true,
    filterable: false,
    editable: true,
    usedInCreate: true,
    description: "Short summary",
    priority: 3,
    expandedOnly: true,
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
    description: "DOWNLOADABLE or PHYSICAL",
    options: [
      { value: "DOWNLOADABLE", label: "Downloadable" },
      { value: "PHYSICAL", label: "Physical" },
    ],
    priority: 1,
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          switch (value) {
            case "DOWNLOADABLE":
              return "primary";
            case "PHYSICAL":
              return "success";
            default:
              return "secondary";
          }
        },
      },
    },
  },
  {
    key: "walletType",
    title: "Wallet Type",
    type: "select",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Fiat, Spot, or Funding",
    apiEndpoint: {
      url: "/api/admin/finance/wallet/options",
      method: "GET",
    },
    priority: 3,
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          switch (value) {
            case "FIAT":
              return "primary";
            case "SPOT":
              return "success";
            case "ECO":
              return "warning";
            default:
              return "secondary";
          }
        },
        withDot: false,
      },
    },
  },
  {
    key: "currency",
    title: "Currency",
    type: "select",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Product currency",
    priority: 1,
    dynamicSelect: {
      refreshOn: "walletType", // watch the walletType field
      // When walletType changes, call endpointBuilder with its current value.
      endpointBuilder: (walletTypeValue: string | undefined) =>
        walletTypeValue
          ? {
              url: `/api/admin/finance/currency/options?type=${walletTypeValue}`,
              method: "GET",
            }
          : null,
      disableWhenEmpty: true, // disable currency select when walletType is not set
    },
  },
  {
    key: "price",
    title: "Price",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Product price",
    priority: 1,
  },
  {
    key: "inventoryQuantity",
    title: "Stock",
    type: "number",
    sortable: true,
    searchable: false,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Inventory quantity",
    priority: 3,
    expandedOnly: true,
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
    description: "Product status",
    priority: 1,
  },
];
