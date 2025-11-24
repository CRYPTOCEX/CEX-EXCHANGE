"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { Settings } from "@/types/ecommerce/settings";
import { useTranslations } from "next-intl";

interface DisplaySettingsSectionProps {
  settings: any;
  onUpdate: <T extends keyof any>(key: T, value: any[T]) => void;
}

export default function DisplaySettingsSection({
  settings,
  onUpdate,
}: DisplaySettingsSectionProps) {
  const t = useTranslations("ext");
  return (
    <Card className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800">
      <CardContent className="space-y-6 pt-6">
        <h3 className="text-lg font-medium">{t("display_settings")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="productsPerPage">{t("products_per_page")}</Label>
            <Input
              id="productsPerPage"
              type="number"
              value={settings.ecommerceProductsPerPage}
              onChange={(e) =>
                onUpdate("ecommerceProductsPerPage", Number(e.target.value))
              }
              placeholder="Enter products per page"
              min="1"
              max="100"
              className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
            />
            <p className="text-xs text-muted-foreground">
              {t("number_of_products_product_listings")}
            </p>
          </div>
        </div>
        <div className="space-y-4 mt-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showProductRatings"
              checked={settings.ecommerceShowProductRatings}
              onCheckedChange={(checked) =>
                onUpdate("ecommerceShowProductRatings", !!checked)
              }
              className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
            />
            <Label htmlFor="showProductRatings" className="text-gray-700 dark:text-gray-300">
              {t("show_product_ratings")}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showRelatedProducts"
              checked={settings.ecommerceShowRelatedProducts}
              onCheckedChange={(checked) =>
                onUpdate("ecommerceShowRelatedProducts", !!checked)
              }
              className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
            />
            <Label htmlFor="showRelatedProducts" className="text-gray-700 dark:text-gray-300">
              {t("show_related_products")}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showFeaturedProducts"
              checked={settings.ecommerceShowFeaturedProducts}
              onCheckedChange={(checked) =>
                onUpdate("ecommerceShowFeaturedProducts", !!checked)
              }
              className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
            />
            <Label
              htmlFor="showFeaturedProducts"
              className="text-gray-700 dark:text-gray-300"
            >
              {t("show_featured_products")}
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
