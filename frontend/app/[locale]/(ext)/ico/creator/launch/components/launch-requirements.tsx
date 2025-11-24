import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function LaunchRequirements() {
  const t = useTranslations("ext");
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("eligibility_requirements")}</CardTitle>
          <CardDescription>
            {t("projects_must_meet_our_platform")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium">{t("legal_compliance")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("your_project_must_it_operates")}.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium">{t("kyc_verification")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("all_team_members_verification_process")}.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium">
                  {t("working_product_or_prototype")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t("your_project_should_its_functionality")}.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium">{t("Whitepaper")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("your_project_must_and_roadmap")}.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium">{t("team_experience")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("your_team_should_specific_industry")}.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("technical_requirements")}</CardTitle>
          <CardDescription>
            {t("technical_specifications_your_token_must_meet")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium">{t("smart_contract_audit")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("your_token_smart_before_launch")}.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium">{t("standard_compliance")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("your_token_must_standards_(e")}. g.{" "}
                  {t("erc-20_bep-20)_for_your_chosen_blockchain")}.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium">{t("source_code_verification")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("your_smart_contract_blockchain_explorer")}.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("important_notes")}</CardTitle>
          <CardDescription>
            {t("additional_information_about_the_launch_process")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium">{t("review_process")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("the_review_process_typically_takes_1-2_weeks")}.{" "}
                  {t("our_team_will_is_needed")}.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium">{t("platform_fees")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("our_platform_charges_target_amount")}.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium">{t("marketing_support")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("we_provide_marketing_chosen_package")}.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
