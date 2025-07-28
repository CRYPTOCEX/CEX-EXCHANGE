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
    <Card className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
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
              className="dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100"
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
              className="dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100"
            />
            <Label htmlFor="showProductRatings" className="dark:text-zinc-300">
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
              className="dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100"
            />
            <Label htmlFor="showRelatedProducts" className="dark:text-zinc-300">
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
              className="dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100"
            />
            <Label
              htmlFor="showFeaturedProducts"
              className="dark:text-zinc-300"
            >
              {t("show_featured_products")}
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
