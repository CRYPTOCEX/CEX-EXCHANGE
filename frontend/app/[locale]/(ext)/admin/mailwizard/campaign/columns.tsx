import { Shield, ClipboardList, Mail, CalendarIcon } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique campaign identifier",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "name",
    title: "Name",
    type: "text",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Campaign name",
    priority: 1,
  },
  {
    key: "subject",
    title: "Subject",
    type: "text",
    icon: Mail,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Email subject",
    priority: 1,
  },
  {
    key: "template",
    title: "Template",
    type: "custom",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Linked Mailwizard Template",
    render: (value: any, row: any) => {
      const template = row?.template || value;
      if (template && typeof template === "object" && template.id) {
        return (
          <Link
            href={`/admin/mailwizard/template/${template.id}`}
            className="text-blue-600 hover:underline"
          >
            {template.name || "View Template"}
          </Link>
        );
      }
      return "N/A";
    },
    priority: 1,
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    description:
      "Campaign status: PENDING, PAUSED, ACTIVE, STOPPED, COMPLETED, or CANCELLED",
    options: [
      { value: "PENDING", label: "Pending" },
      { value: "PAUSED", label: "Paused" },
      { value: "ACTIVE", label: "Active" },
      { value: "STOPPED", label: "Stopped" },
      { value: "COMPLETED", label: "Completed" },
      { value: "CANCELLED", label: "Cancelled" },
    ],
    priority: 1,
    render: {
      type: "badge",
      config: {
        variant: (value: any) => {
          switch (value) {
            case "PENDING":
              return "warning";
            case "PAUSED":
              return "info";
            case "ACTIVE":
              return "success";
            case "STOPPED":
              return "danger";
            case "COMPLETED":
              return "primary";
            case "CANCELLED":
              return "danger";
            default:
              return "secondary";
          }
        },
      },
    },
  },
  {
    key: "speed",
    title: "Speed",
    type: "number",
    icon: ClipboardList,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Delivery speed",
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "targets",
    title: "Targets",
    type: "custom",
    icon: ClipboardList,
    sortable: false,
    searchable: true,
    filterable: false,
    editable: true,
    usedInCreate: true,
    description: "Target audience details",
    priority: 2,
    expandedOnly: true,
    render: (value: any, row: any) => {
      const t = useTranslations("ext");
      let targets: any[] = [];
      if (typeof value === "string") {
        try {
          targets = JSON.parse(value);
        } catch (err) {
          console.error("Error parsing targets:", err);
        }
      } else if (Array.isArray(value)) {
        targets = value;
      }
      const total = targets.length;
      const completed = targets.filter((t) => t.status === "COMPLETED").length;
      const percentComplete = total ? Math.round((completed / total) * 100) : 0;

      return (
        <div className="flex flex-col">
          <div className="mt-1.5 w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${percentComplete}%` }}
            ></div>
          </div>
          <div className="text-xs text-muted-foreground">
            {percentComplete}
            {t("%_completed")}
          </div>
        </div>
      );
    },
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Campaign creation date",
    render: { type: "date", format: "PPP" },
    priority: 2,
    expandedOnly: true,
  },
];
