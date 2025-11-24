import { Shield, ClipboardList, CheckSquare, CalendarIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
    description: "Unique futures market identifier",
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
    key: "expiration",
    title: "Expiration",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Expiration date for the contract",
    render: { type: "date", format: "PPP" },
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "status",
    title: "Active",
    type: "toggle",
    icon: CheckSquare,
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Market active status",
    priority: 1,
  },
  {
    key: "metadata",
    title: "Metadata",
    type: "custom",
    icon: ClipboardList,
    sortable: false,
    searchable: false,
    filterable: false,
    description: "Additional futures market info",
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
              {/* Taker Fee */}
              <div className="flex items-center gap-2">
                <Badge variant="outline">{t("taker_fee")}</Badge>
                <span className="text-sm">{value.taker}%</span>
              </div>
              {/* Maker Fee */}
              <div className="flex items-center gap-2">
                <Badge variant="outline">{t("maker_fee")}</Badge>
                <span className="text-sm">{value.maker}%</span>
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
                  <CardTitle className="text-sm font-medium mb-2">
                    {t("Limits")}
                  </CardTitle>
                  <Separator />
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
