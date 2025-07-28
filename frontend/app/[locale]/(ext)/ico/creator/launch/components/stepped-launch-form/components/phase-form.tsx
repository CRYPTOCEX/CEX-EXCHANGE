"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface Phase {
  id: string | number;
  name: string;
  tokenPrice: number;
  allocation: number;
  durationDays: number;
}

interface PhaseFormProps {
  phase: Phase;
  index: number;
  canRemove: boolean;
  onUpdate: (id: string | number, field: string, value: any) => void;
  onRemove: (id: string | number) => void;
}

export default function PhaseForm({
  phase,
  index,
  canRemove,
  onUpdate,
  onRemove,
}: PhaseFormProps) {
  const t = useTranslations("ext");
  return (
    <div className="space-y-4 p-4 border rounded-md">
      <div className="flex items-center justify-between">
        <h5 className="font-medium">
          {t("Phase")}
          {index + 1}
        </h5>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(phase.id)}
            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {t("Remove")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("phase_name")}</label>
          <Input
            placeholder="e.g. Seed, Private, Public"
            value={phase.name}
            onChange={(e) => onUpdate(phase.id, "name", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("token_price_(usd)")}
          </label>
          <Input
            type="number"
            step="0.0001"
            placeholder="e.g. 0.05"
            value={phase.tokenPrice || ""}
            onChange={(e) =>
              onUpdate(phase.id, "tokenPrice", Number(e.target.value))
            }
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("token_allocation")}</label>
          <Input
            type="number"
            placeholder="e.g. 1000000"
            value={phase.allocation || ""}
            onChange={(e) =>
              onUpdate(phase.id, "allocation", Number(e.target.value))
            }
          />
          <p className="text-xs text-muted-foreground">
            {t("number_of_tokens_available_in_this_phase")}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("duration_(days)")}</label>
          <Input
            type="number"
            placeholder="e.g. 14"
            value={phase.durationDays || ""}
            onChange={(e) =>
              onUpdate(phase.id, "durationDays", Number(e.target.value))
            }
          />
        </div>
      </div>
    </div>
  );
}
