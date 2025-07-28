"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ComponentProps } from "./types";
import { useTranslations } from "next-intl";

export function Visibility({ settings, onSettingChange }: ComponentProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="visibleDesktop" className="text-xs">
            {t("Desktop")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("screen_width_greater_than_1024px")}
          </p>
        </div>
        <Switch
          id="visibleDesktop"
          checked={settings.visibleDesktop !== false}
          onCheckedChange={(checked) =>
            onSettingChange("visibleDesktop", checked)
          }
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="visibleTablet" className="text-xs">
            {t("Tablet")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("screen_width_768px_to_1024px")}
          </p>
        </div>
        <Switch
          id="visibleTablet"
          checked={settings.visibleTablet !== false}
          onCheckedChange={(checked) =>
            onSettingChange("visibleTablet", checked)
          }
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="visibleMobile" className="text-xs">
            {t("Mobile")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("screen_width_less_than_768px")}
          </p>
        </div>
        <Switch
          id="visibleMobile"
          checked={settings.visibleMobile !== false}
          onCheckedChange={(checked) =>
            onSettingChange("visibleMobile", checked)
          }
        />
      </div>
      <div className="pt-2 border-t">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="hideOnOverflow" className="text-xs">
              {t("hide_on_overflow")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("hide_element_if_it_overflows_its_container")}
            </p>
          </div>
          <Switch
            id="hideOnOverflow"
            checked={settings.hideOnOverflow === true}
            onCheckedChange={(checked) =>
              onSettingChange("hideOnOverflow", checked)
            }
          />
        </div>
      </div>
    </div>
  );
}
