"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import type { FormData } from "../types";
import PhaseForm from "../components/phase-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface OfferingStructureStepProps {
  formData: FormData;
  updateFormData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
  maxPhases?: number;
}

export default function OfferingStructureStep({
  formData,
  updateFormData,
  errors,
  maxPhases = 999,
}: OfferingStructureStepProps) {
  const t = useTranslations("ext");
  const addPhase = () => {
    updateFormData("phases", [
      ...formData.phases,
      {
        id: String(Date.now()),
        name: "",
        tokenPrice: 0,
        allocation: 0,
        durationDays: 0,
      },
    ]);
  };

  const removePhase = (id: string | number) => {
    if (formData.phases.length > 1) {
      updateFormData(
        "phases",
        formData.phases.filter((phase) => String(phase.id) !== String(id))
      );
    }
  };

  const updatePhase = (id: string | number, field: string, value: any) => {
    updateFormData(
      "phases",
      formData.phases.map((phase) =>
        String(phase.id) === String(id) ? { ...phase, [field]: value } : phase
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Target Amount (USD)"
          type="number"
          placeholder="e.g. 1000000"
          value={formData.targetAmount || ""}
          onChange={(e) =>
            updateFormData("targetAmount", Number(e.target.value))
          }
          error={!!errors.targetAmount}
          errorMessage={errors.targetAmount}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("start_date")}</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.startDate ? (
                  format(formData.startDate, "PPP")
                ) : (
                  <span>{t("pick_a_date")}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.startDate || undefined}
                onSelect={(date) => updateFormData("startDate", date)}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            {t("the_date_when_as_upcoming")}
          </p>
          {errors.startDate && (
            <p className="text-sm font-medium text-destructive">
              {errors.startDate}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-medium">{t("offering_phases")}</h4>
          <div className="flex items-center gap-2">
            {formData.selectedPlan && (
              <span className="text-sm text-muted-foreground">
                {formData.phases.length}
                _
                {maxPhases}
                {t("phases")}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPhase}
              disabled={formData.phases.length >= maxPhases}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("add_phase")}
            </Button>
          </div>
        </div>

        {formData.selectedPlan && formData.phases.length >= maxPhases && (
          <Alert className="bg-amber-50 text-amber-800 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-800" />
            <AlertDescription>
              {t("youve_reached_the_in_your")} {formData.selectedPlan.name}
              {t("plan")}.
              {formData.selectedPlan.name !== "Premium" &&
                " Consider upgrading your plan for more offering phases."}
            </AlertDescription>
          </Alert>
        )}

        {formData.phases.map((phase) => (
          <PhaseForm
            key={String(phase.id)}
            phase={phase}
            index={formData.phases.indexOf(phase)}
            canRemove={formData.phases.length > 1}
            onUpdate={updatePhase}
            onRemove={removePhase}
          />
        ))}

        {errors.phases && (
          <p className="text-sm font-medium text-destructive">
            {errors.phases}
          </p>
        )}
      </div>
    </div>
  );
}
