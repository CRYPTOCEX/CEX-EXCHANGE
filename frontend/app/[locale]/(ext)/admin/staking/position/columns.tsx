import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { useTranslations } from "next-intl";

export const columns = [
  {
    key: "id",
    title: "ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique identifier for the position",
    render: {
      type: "custom",
      render: (value: string): ReactNode => value.substring(0, 8) + "...",
    },
    expandedOnly: true,
  },
  {
    key: "user",
    title: "User",
    type: "compound",
    expandedTitle: (row) => `User: ${row.id}`,
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Investor",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "User's profile picture",
          filterable: false,
          sortable: false,
        },
        primary: {
          key: ["firstName", "lastName"],
          title: ["First Name", "Last Name"],
          icon: User,
          editable: false,
        },
        secondary: {
          key: "email",
          title: "Email",
          editable: false,
        },
      },
    },
    priority: 1,
  },
  {
    key: "pool.name",
    title: "Pool",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Associated staking pool",
    render: {
      type: "custom",
      render: (_: any, row: any): ReactNode =>
        row.pool && row.pool.name ? row.pool.name : "N/A",
    },
  },
  {
    key: "amount",
    title: "Amount",
    type: "number",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Amount staked",
  },
  {
    key: "startDate",
    title: "Start Date",
    type: "date",
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Position start date",
    render: { type: "date", format: "PPP" },
  },
  {
    key: "endDate",
    title: "End Date",
    type: "date",
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Position end date",
    render: { type: "date", format: "PPP" },
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Current position status",
    render: {
      type: "custom",
      render: (value: string): ReactNode => {
        const t = useTranslations("ext");
        switch (value.toUpperCase()) {
          case "ACTIVE":
            return <Badge className="bg-green-500">{t("Active")}</Badge>;
          case "COMPLETED":
            return <Badge className="bg-blue-500">{t("Completed")}</Badge>;
          case "CANCELLED":
            return <Badge variant="secondary">{t("Cancelled")}</Badge>;
          case "PENDING_WITHDRAWAL":
            return (
              <Badge className="bg-amber-500">{t("pending_withdrawal")}</Badge>
            );
          default:
            return <Badge variant="outline">{value}</Badge>;
        }
      },
    },
    options: [
      { value: "ACTIVE", label: "Active", color: "success" },
      { value: "COMPLETED", label: "Completed", color: "success" },
      { value: "CANCELLED", label: "Cancelled", color: "destructive" },
      {
        value: "PENDING_WITHDRAWAL",
        label: "Pending Withdrawal",
        color: "warning",
      },
    ],
  },
  // TODO: Uncomment when stakingComputations is available
  // {
  //   key: "pendingRewards",
  //   title: "Rewards",
  //   type: "custom",
  //   sortable: false,
  //   searchable: false,
  //   filterable: false,
  //   description: "Pending rewards for the position",
  //   render: {
  //     type: "custom",
  //     render: (_: any, row: any): ReactNode => {
  //       const pending = stakingComputations.getPendingRewards(row.id);
  //       const symbol = row.pool && row.pool.symbol ? row.pool.symbol : "";
  //       return (
  //         <span className="text-green-500">
  //           +{pending} {symbol}
  //         </span>
  //       );
  //     },
  //   },
  // },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Position creation date",
    render: { type: "date", format: "PPP" },
    priority: 3,
  },
];
