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
  const t = useTranslations("dashboard");
  return (
    <div className="p-6">
      <div className="flex flex-col items-center justify-center text-center mb-8">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4 shadow-sm">
          <Settings className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {t("no_field_selected")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-[250px]">
          {t("select_a_field_its_behavior")}
        </p>
      </div>

      <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-100 dark:border-blue-900/20 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-md mt-0.5">
              <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-800 dark:text-white mb-1">
                {t("quick_tips")}
              </h4>
              <p className="text-xs text-gray-600 dark:text-zinc-300">
                {t("configure_field_properties_user_experience")}
              </p>
            </div>
          </div>
          <ul className="space-y-3 pl-9">
            <li className="flex items-start gap-2 text-xs text-gray-600 dark:text-zinc-400">
              <ChevronRight className="h-3 w-3 mt-0.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <span>{t("click_any_field_to_edit_its_properties")}</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-gray-600 dark:text-zinc-400">
              <ChevronRight className="h-3 w-3 mt-0.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <span>{t("set_validation_rules_to_ensure_data_quality")}</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-gray-600 dark:text-zinc-400">
              <ChevronRight className="h-3 w-3 mt-0.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <span>{t("add_conditional_logic_user_input")}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Separator className="my-6 bg-gray-200 dark:bg-zinc-800" />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-500 dark:text-purple-400" />
          <h4 className="text-sm font-medium text-gray-700 dark:text-white">
            {t("field_types")}
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldTypeCard
            icon={<Type className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
            name="Text"
            category="Basic"
            color="blue"
          />
          <FieldTypeCard
            icon={
              <AlignLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            }
            name="Textarea"
            category="Basic"
            color="blue"
          />
          <FieldTypeCard
            icon={
              <List className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            }
            name="Dropdown"
            category="Choice"
            color="purple"
          />
          <FieldTypeCard
            icon={
              <CheckSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            }
            name="Checkbox"
            category="Choice"
            color="purple"
          />
          <FieldTypeCard
            icon={
              <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            }
            name="Date"
            category="Special"
            color="amber"
          />
          <FieldTypeCard
            icon={
              <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            }
            name="Email"
            category="Contact"
            color="emerald"
          />
        </div>
      </div>

      <Separator className="my-6 bg-gray-200 dark:bg-zinc-800" />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          <h4 className="text-sm font-medium text-gray-700 dark:text-white">
            {t("field_features")}
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FeatureCard
            icon={
              <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            }
            name="Visibility"
            description="Show or hide fields based on conditions"
          />
          <FeatureCard
            icon={
              <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            }
            name="Validation"
            description="Set rules for data entry"
          />
        </div>
      </div>
    </div>
  );
}
