"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";

interface GeneralSettingsSectionProps {
  settings: any;
  onUpdate: <T extends keyof any>(key: T, value: any[T]) => void;
}

export default function GeneralSettingsSection({
  settings,
  onUpdate,
}: GeneralSettingsSectionProps) {
  const t = useTranslations("ext");
  return (
    <div className="space-y-6">
      <Card className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
        <CardContent className="space-y-6 pt-6">
          <h3 className="text-lg font-medium">{t("tax_settings")}</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="taxEnabled"
                checked={settings["ecommerceTaxEnabled"]}
                onCheckedChange={(checked) =>
                  onUpdate("ecommerceTaxEnabled", !!checked)
                }
                className="dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100"
              />
              <Label htmlFor="taxEnabled" className="dark:text-zinc-300">
                {t("enable_tax_calculation")}
              </Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="defaultTaxRate" className="dark:text-zinc-300">
                  {t("default_tax_rate_(%)")}
                </Label>
                <Input
                  id="defaultTaxRate"
                  type="number"
                  value={settings["ecommerceDefaultTaxRate"]}
                  onChange={(e) =>
                    onUpdate("ecommerceDefaultTaxRate", Number(e.target.value))
                  }
                  placeholder="Enter default tax rate"
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={!settings["ecommerceTaxEnabled"]}
                  className="dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
        <CardContent className="space-y-6 pt-6">
          <h3 className="text-lg font-medium">{t("shipping_settings")}</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="shippingEnabled"
                checked={settings["ecommerceShippingEnabled"]}
                onCheckedChange={(checked) =>
                  onUpdate("ecommerceShippingEnabled", !!checked)
                }
                className="dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100"
              />
              <Label htmlFor="shippingEnabled" className="dark:text-zinc-300">
                {t("enable_shipping")}
              </Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="defaultShippingCost"
                  className="dark:text-zinc-300"
                >
                  {t("default_shipping_cost")}
                </Label>
                <Input
                  id="defaultShippingCost"
                  type="number"
                  value={settings["ecommerceDefaultShippingCost"]}
                  onChange={(e) =>
                    onUpdate(
                      "ecommerceDefaultShippingCost",
                      Number(e.target.value)
                    )
                  }
                  placeholder="Enter default shipping cost"
                  min="0"
                  step="0.01"
                  disabled={!settings["ecommerceShippingEnabled"]}
                  className="dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
