import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Link } from "@/i18n/routing";
import type { FormData } from "../types";
import { useTranslations } from "next-intl";
interface ReviewStepProps {
  formData: FormData;
  updateFormData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
}
export default function ReviewStep({
  formData,
  updateFormData,
  errors,
}: ReviewStepProps) {
  const t = useTranslations("ext_ico");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-medium">{tExt("token_information")}</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{tExt("token_name")}</p>
            <p className="font-medium">
              {formData.name} ({formData.symbol})
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{tExt("token_type")}</p>
            <p className="font-medium">{formData.tokenType}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Blockchain</p>
            <p className="font-medium">{formData.blockchain}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{tExt("total_supply")}</p>
            <p className="font-medium">
              {formData.totalSupply.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Team</h4>
        <div className="space-y-2">
          {formData.teamMembers.map((member) => (
            <div key={member.id} className="text-sm p-2 bg-muted/50 rounded">
              <p className="font-medium">
                {member.name} - {member.role}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Roadmap</h4>
        <div className="space-y-2">
          {formData.roadmap.map((item) => {
            return (
              <div key={item.id} className="text-sm p-2 bg-muted/50 rounded">
                <p className="font-medium">{item.title}</p>
                <p className="text-muted-foreground">
                  {item.date ? format(item.date, "PPP") : "Date not set"} •
                  {item.completed ? " Completed" : " Planned"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">{t("offering_details")}</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{t("target_amount")}</p>
            <p className="font-medium">
              ${formData.targetAmount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{tExt("start_date")}</p>
            <p className="font-medium">
              {formData.startDate
                ? format(formData.startDate, "PPP")
                : "Not set"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Phases</p>
          <div className="space-y-2">
            {formData.phases.map((phase) => {
              return (
                <div key={phase.id} className="text-sm p-2 bg-muted/50 rounded">
                  <p className="font-medium">{phase.name}</p>
                  <p className="text-muted-foreground">
                    {tCommon("price")}{phase.tokenPrice.toFixed(4)} {tExt('allocation')}:{" "}
                    {phase.allocation.toLocaleString()} {tCommon("duration")}:{" "}
                    {phase.durationDays} days
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
        <Checkbox
          checked={formData.termsAccepted}
          onCheckedChange={(checked) =>
            updateFormData("termsAccepted", checked === true)
          }
          id="terms"
        />
        <div className="space-y-1 leading-none">
          <label htmlFor="terms" className="text-sm font-medium">
            {t("i_accept_the_terms_and_conditions")}
          </label>
          <p className="text-sm text-muted-foreground">
            {t("by_submitting_this_application_you_agree_to_our")}{" "}
            <Link href="/terms" className="text-primary hover:underline">
              {t("terms_of_service")}
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              {t("privacy_policy")}
            </Link>
            .
          </p>
        </div>
      </div>
      {errors.termsAccepted && (
        <p className="text-sm font-medium text-destructive">
          {errors.termsAccepted}
        </p>
      )}
    </div>
  );
}
