import { Shield, ClipboardList, CheckSquare, CalendarIcon } from "lucide-react";
// These imports assume you’ve generated the shadcn components in "@/components/ui/..."
// Adjust the import paths to match your setup:
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
    description: "Unique market identifier",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "currency",
    title: "Currency",
    type: "text",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Base currency",
    priority: 1,
  },
  {
    key: "pair",
    title: "Pair",
    type: "text",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Trading pair",
    priority: 1,
  },
  {
    key: "isTrending",
    title: "Trending",
    type: "boolean",
    icon: CheckSquare,
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Trending market flag",
    priority: 1,
  },
  {
    key: "isHot",
    title: "Hot",
    type: "boolean",
    icon: CheckSquare,
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Hot market flag",
    priority: 1,
    expandedOnly: true,
  },
  {
    key: "metadata",
    title: "Metadata",
    type: "custom",
    icon: ClipboardList,
    sortable: false,
    searchable: false,
    filterable: false,
    description: "Additional market info",
    render: {
      type: "custom",
      render: (value: any) => {
        const t = useTranslations("ext");
        if (!value) {
          return (
            <span className="text-sm text-muted-foreground">{t("N_A")}</span>
          );
        }

        return (
          <Card>
            <CardContent className="p-5 space-y-3">
              {/* Taker */}
              <div className="flex items-center gap-2">
                <Badge variant="outline">{t("Taker")}</Badge>
                <span className="text-sm">{value.taker}</span>
              </div>

              {/* Maker */}
              <div className="flex items-center gap-2">
                <Badge variant="outline">{t("Maker")}</Badge>
                <span className="text-sm">{value.maker}</span>
              </div>

              {/* Precision */}
              {value.precision && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{t("Precision")}</Badge>
                  <span className="text-sm">
                    {t("amount")}
                    {value.precision.amount}
                    {t("price")} {value.precision.price}
                  </span>
                </div>
              )}

              {/* Limits */}
              {value.limits && (
                <div>
                  <h4 className="text-sm font-medium mb-2">{t("Limits")}</h4>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-1 pr-2 text-left font-medium">
                          {t("Type")}
                        </th>
                        <th className="py-1 pr-2 text-left font-medium">
                          {t("Min")}
                        </th>
                        <th className="py-1 pr-2 text-left font-medium">
                          {t("Max")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(value.limits).map(
                        ([key, limit]: [string, any]) => (
                          <tr key={key} className="border-b last:border-none">
                            <td className="py-1 pr-2 capitalize">{key}</td>
                            <td className="py-1 pr-2">{limit.min ?? "-"}</td>
                            <td className="py-1 pr-2">{limit.max ?? "-"}</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      },
    },
    priority: 2,
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
    description: "Market status",
    priority: 1,
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Market creation date",
    render: { type: "date", format: "PPP" },
    priority: 2,
    expandedOnly: true,
  },
];
