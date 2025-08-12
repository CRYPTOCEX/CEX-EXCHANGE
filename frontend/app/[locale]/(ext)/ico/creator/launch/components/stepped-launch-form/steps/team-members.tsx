"use client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { FormData } from "../types";
import TeamMemberForm from "../components/team-member-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface TeamMembersStepProps {
  formData: FormData;
  updateFormData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
  maxTeamMembers?: number;
}

export default function TeamMembersStep({
  formData,
  updateFormData,
  errors,
  maxTeamMembers = 999,
}: TeamMembersStepProps) {
  const t = useTranslations("ext");
  const addTeamMember = () => {
    updateFormData("teamMembers", [
      ...formData.teamMembers,
      {
        id: Date.now().toString(),
        name: "",
        role: "",
        bio: "",
        avatar: "",
        linkedin: "",
        twitter: "",
        github: "",
        website: "",
      },
    ]);
  };

  const removeTeamMember = (id: string | number) => {
    if (formData.teamMembers.length > 1) {
      updateFormData(
        "teamMembers",
        formData.teamMembers.filter(
          (member) => String(member.id) !== String(id)
        )
      );
    }
  };

  const updateTeamMember = (
    id: string | number,
    field: string,
    value: string | File | null
  ) => {
    updateFormData(
      "teamMembers",
      formData.teamMembers.map((member) =>
        String(member.id) === String(id)
          ? { ...member, [field]: value }
          : member
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-medium">{t("team_members")}</h4>
        <div className="flex items-center gap-2">
          {formData.selectedPlan && (
            <span className="text-sm text-muted-foreground">
              {formData.teamMembers.length}/{maxTeamMembers} {t("members")}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTeamMember}
            disabled={formData.teamMembers.length >= maxTeamMembers}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("add_team_member")}
          </Button>
        </div>
      </div>

      {formData.selectedPlan &&
        formData.teamMembers.length >= maxTeamMembers && (
          <Alert className="bg-amber-50 text-amber-800 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-800" />
            <AlertDescription>
              {t("youve_reached_the_in_your")} {formData.selectedPlan.name}
              {t("plan")}.
              {formData.selectedPlan.name !== "Premium" &&
                " Consider upgrading your plan for more team members."}
            </AlertDescription>
          </Alert>
        )}

      {formData.teamMembers.map((member) => (
        <TeamMemberForm
          key={String(member.id)}
          member={member}
          index={formData.teamMembers.indexOf(member)}
          canRemove={formData.teamMembers.length > 1}
          onUpdate={updateTeamMember}
          onRemove={removeTeamMember}
        />
      ))}

      {errors.teamMembers && (
        <p className="text-sm font-medium text-destructive">
          {errors.teamMembers}
        </p>
      )}
    </div>
  );
}
