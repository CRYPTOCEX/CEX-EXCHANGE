"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { FormData } from "../types";
import RoadmapItemForm from "../components/roadmap-item-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface RoadmapStepProps {
  formData: FormData;
  updateFormData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
  maxRoadmapItems?: number;
}

export default function RoadmapStep({
  formData,
  updateFormData,
  errors,
  maxRoadmapItems = 999,
}: RoadmapStepProps) {
  const t = useTranslations("ext");
  const addRoadmapItem = () => {
    updateFormData("roadmap", [
      ...formData.roadmap,
      {
        id: String(Date.now()),
        title: "",
        description: "",
        date: null,
        completed: false,
      },
    ]);
  };

  const removeRoadmapItem = (id: string | number) => {
    if (formData.roadmap.length > 1) {
      updateFormData(
        "roadmap",
        formData.roadmap.filter((item) => String(item.id) !== String(id))
      );
    }
  };

  const updateRoadmapItem = (
    id: string | number,
    field: string,
    value: any
  ) => {
    updateFormData(
      "roadmap",
      formData.roadmap.map((item) =>
        String(item.id) === String(id) ? { ...item, [field]: value } : item
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-medium">{t("project_roadmap")}</h4>
        <div className="flex items-center gap-2">
          {formData.selectedPlan && (
            <span className="text-sm text-muted-foreground">
              {formData.roadmap.length}
              _
              {maxRoadmapItems}
              {t("items")}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRoadmapItem}
            disabled={formData.roadmap.length >= maxRoadmapItems}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("add_milestone")}
          </Button>
        </div>
      </div>

      {formData.selectedPlan && formData.roadmap.length >= maxRoadmapItems && (
        <Alert className="bg-amber-50 text-amber-800 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-800" />
          <AlertDescription>
            {t("youve_reached_the_in_your")} {formData.selectedPlan.name}
            {t("plan")}.
            {formData.selectedPlan.name !== "Premium" &&
              " Consider upgrading your plan for more roadmap items."}
          </AlertDescription>
        </Alert>
      )}

      {formData.roadmap.map((item) => (
        <RoadmapItemForm
          key={String(item.id)}
          item={item}
          index={formData.roadmap.indexOf(item)}
          canRemove={formData.roadmap.length > 1}
          onUpdate={updateRoadmapItem}
          onRemove={removeRoadmapItem}
        />
      ))}

      {errors.roadmap && (
        <p className="text-sm font-medium text-destructive">{errors.roadmap}</p>
      )}
    </div>
  );
}
