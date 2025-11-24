"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface ResolutionFormProps {
  resolutionDetails: {
    outcome: string;
    notes: string;
  };
  setResolutionDetails: (details: { outcome: string; notes: string }) => void;
  handleResolveDispute: () => Promise<void>;
  isSubmitting: boolean;
}

export function ResolutionForm({
  resolutionDetails,
  setResolutionDetails,
  handleResolveDispute,
  isSubmitting,
}: ResolutionFormProps) {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("resolve_dispute")}</CardTitle>
        <CardDescription>
          {t("make_a_final_decision_on_this_dispute")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="outcome">{t("resolution_outcome")}</Label>
            <Select
              value={resolutionDetails.outcome}
              onValueChange={(value) =>
                setResolutionDetails({ ...resolutionDetails, outcome: value })
              }
            >
              <SelectTrigger id="outcome">
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer">{t("resolve_for_buyer")}</SelectItem>
                <SelectItem value="seller">
                  {t("resolve_for_seller")}
                </SelectItem>
                <SelectItem value="split">{t("split_resolution")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("resolution_notes")}</Label>
            <Textarea
              id="notes"
              placeholder="Enter details about the resolution..."
              value={resolutionDetails.notes}
              onChange={(e) =>
                setResolutionDetails({
                  ...resolutionDetails,
                  notes: e.target.value,
                })
              }
              className="min-h-[100px]"
            />
          </div>

          <Button
            onClick={handleResolveDispute}
            disabled={isSubmitting || !resolutionDetails.outcome}
            className="w-full"
          >
            {isSubmitting ? "Processing..." : "Submit Resolution"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
