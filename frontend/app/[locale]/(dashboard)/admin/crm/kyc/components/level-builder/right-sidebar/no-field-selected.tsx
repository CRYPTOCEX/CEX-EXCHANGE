"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  ChevronRight,
  Lightbulb,
  Layers,
  Type,
  AlignLeft,
  List,
  CheckSquare,
  Calendar,
  Mail,
  Eye,
  FileText,
  Sparkles,
} from "lucide-react";
import { FieldTypeCard } from "./field-type-card";
import { FeatureCard } from "./feature-card";
import { useTranslations } from "next-intl";

export function NoFieldSelected() {
  const t = useTranslations("dashboard_admin");
  return (
    <div className="p-6">
      <div className="flex flex-col items-center justify-center text-center mb-8">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 shadow-sm">
          <Settings className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          {t("no_field_selected")}
        </h3>
        <p className="text-sm text-subtle-foreground max-w-[250px]">
          {t("select_a_field_its_behavior")}
        </p>
      </div>

      <Card className="bg-primary/5 dark:bg-primary/20 border-primary/30 mb-6">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="bg-primary/15 dark:bg-primary/30 p-1.5 rounded-md mt-0.5">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground mb-1">
                {t("quick_tips")}
              </h4>
              <p className="text-xs text-muted-foreground">
                {t("configure_field_properties_user_experience")}
              </p>
            </div>
          </div>
          <ul className="space-y-3 pl-9">
            <li className="flex items-start gap-2 text-xs text-muted-foreground">
              <ChevronRight className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
              <span>{t("click_any_field_to_edit_its_properties")}</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-muted-foreground">
              <ChevronRight className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
              <span>{t("set_validation_rules_to_ensure_data_quality")}</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-muted-foreground">
              <ChevronRight className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
              <span>{t("add_conditional_logic_user_input")}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Separator className="my-6 bg-muted" />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-medium text-muted-foreground">
            {t("field_types")}
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldTypeCard
            icon={<Type className="h-4 w-4" />}
            name="Text"
            category="Basic"
          />
          <FieldTypeCard
            icon={<AlignLeft className="h-4 w-4" />}
            name="Textarea"
            category="Basic"
          />
          <FieldTypeCard
            icon={<List className="h-4 w-4" />}
            name="Dropdown"
            category="Choice"
          />
          <FieldTypeCard
            icon={<CheckSquare className="h-4 w-4" />}
            name="Checkbox"
            category="Choice"
          />
          <FieldTypeCard
            icon={<Calendar className="h-4 w-4" />}
            name="Date"
            category="Special"
          />
          <FieldTypeCard
            icon={<Mail className="h-4 w-4" />}
            name="Email"
            category="Contact"
          />
        </div>
      </div>

      <Separator className="my-6 bg-muted" />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-warning" />
          <h4 className="text-sm font-medium text-muted-foreground">
            {t("field_features")}
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FeatureCard
            icon={
              <Eye className="h-4 w-4 text-primary" />
            }
            name="Visibility"
            description={t("show_or_hide_fields_based_on_conditions")}
          />
          <FeatureCard
            icon={
              <FileText className="h-4 w-4 text-primary" />
            }
            name="Validation"
            description={t("set_rules_for_data_entry")}
          />
        </div>
      </div>
    </div>
  );
}
