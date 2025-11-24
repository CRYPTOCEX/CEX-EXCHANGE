import type { Metadata } from "next";
import { TokenEconomicsSimulator } from "./components";
import { useTranslations } from "next-intl";

export const metadata: Metadata = {
  title: "Token Economics Simulator | TokenLaunch",
  description:
    "Design and visualize your token economics, distribution, and vesting schedule",
};

export default function TokenSimulatorPage() {
  const t = useTranslations("ext");
  return (
    <div className="container py-10">
      <div className="flex flex-col space-y-2 mb-8">
        <h1 className="text-3xl font-bold">{t("token_economics_simulator")}</h1>
        <p className="text-muted-foreground max-w-3xl">
          {t("design_your_token_interactive_simulator")}.{" "}
          {t("visualize_distribution_vesting_token_launch")}.
        </p>
      </div>

      <TokenEconomicsSimulator />

      <div className="mt-10 space-y-6">
        <h2 className="text-2xl font-bold">{t("how_to_use_the_simulator")}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-muted/30 rounded-lg">
            <h3 className="text-lg font-medium mb-2">
              1:. {t("token_distribution")}
            </h3>
            <p className="text-muted-foreground">
              {t("define_how_your_community_etc")}.{" "}
              {t("aim_for_a_project_goals")}.
            </p>
          </div>

          <div className="p-6 bg-muted/30 rounded-lg">
            <h3 className="text-lg font-medium mb-2">
              2. {t("vesting_schedule")}
            </h3>
            <p className="text-muted-foreground">
              {t("set_up_vesting_market_flooding")}.{" "}
              {t("consider_cliff_periods_for_team_tokens")}.
            </p>
          </div>

          <div className="p-6 bg-muted/30 rounded-lg">
            <h3 className="text-lg font-medium mb-2">
              3. {t("market_projection")}
            </h3>
            <p className="text-muted-foreground">
              {t("explore_potential_market_and_volatility")}.{" "}
              {t("remember_these_are_future_performance")}.
            </p>
          </div>
        </div>

        <div className="p-6 bg-primary/10 rounded-lg mt-6">
          <h3 className="text-lg font-medium mb-2">{t("expert_tip")}</h3>
          <p className="text-muted-foreground">
            {t("the_most_successful_broader_community")}.{" "}
            {t("consider_how_your_roadmap_milestones")}.
          </p>
        </div>
      </div>
    </div>
  );
}
