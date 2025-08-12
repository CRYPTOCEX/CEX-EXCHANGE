import type { Metadata } from "next";
import { Link } from "@/i18n/routing";
import {
  ArrowRight,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Shield,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";

export const metadata: Metadata = {
  title: "Staking Guide | Learn How to Stake",
  description:
    "Learn how to stake your crypto assets and earn passive income with our comprehensive guide",
};

export default function StakingGuidePage() {
  const t = useTranslations("ext");
  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {t("staking_guide")}
          </h1>
          <p className="text-muted-foreground">
            {t("learn_how_to_passive_income")}
          </p>
        </div>
        <Link href="/staking/pool">
          <Button>
            {t("start_staking")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg border p-6 sticky top-20">
            <h2 className="font-semibold text-lg mb-4">
              {t("guide_contents")}
            </h2>
            <ul className="space-y-2">
              <li>
                <a
                  href="#what-is-staking"
                  className="text-primary hover:underline"
                >
                  {t("what_is_staking")}
                </a>
              </li>
              <li>
                <a
                  href="#how-to-stake"
                  className="text-primary hover:underline"
                >
                  {t("how_to_stake")}
                </a>
              </li>
              <li>
                <a href="#rewards" className="text-primary hover:underline">
                  {t("understanding_rewards")}
                </a>
              </li>
              <li>
                <a href="#risks" className="text-primary hover:underline">
                  {t("risks_and_considerations")}
                </a>
              </li>
              <li>
                <a href="#faq" className="text-primary hover:underline">
                  {t("frequently_asked_questions")}
                </a>
              </li>
            </ul>

            <div className="mt-8 p-4 bg-primary/10 rounded-lg">
              <div className="flex items-start">
                <HelpCircle className="h-5 w-5 mr-2 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">{t("need_help")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("if_you_have_assist_you")}.
                  </p>
                  <Link href="/support" className="px-0 mt-2">
                    <Button variant="link">{t("contact_support")}</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <section id="what-is-staking" className="mb-12">
            <Card>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <BookOpen className="h-5 w-5 mr-2 text-primary" />
                  <CardTitle>{t("what_is_staking")}</CardTitle>
                </div>
                <CardDescription>
                  {t("understanding_the_basics_of_crypto_staking")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  {t("staking_is_a_cryptocurrency_assets")}.{" "}
                  {t("its_similar_to_higher_returns")}.{" "}
                  {t("when_you_stake_blockchain_network")}.
                </p>

                <h3 className="text-lg font-semibold mt-6">
                  {t("how_staking_works")}
                </h3>
                <p>
                  {t("in_traditional_proof_the_blockchain")}.{" "}
                  {t("the_more_tokens_earning_rewards")}.
                </p>
                <p>
                  {t("our_staking_platform_nodes_yourself")}.{" "}
                  {t("we_handle_the_rate_(apr)")}.
                </p>

                <h3 className="text-lg font-semibold mt-6">
                  {t("benefits_of_staking")}
                </h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t("earn_passive_income_on_your_crypto_holdings")}</li>
                  <li>{t("support_the_security_blockchain_networks")}</li>
                  <li>{t("potentially_higher_returns_savings_accounts")}</li>
                  <li>{t("no_specialized_hardware_knowledge_required")}</li>
                  <li>{t("maintain_ownership_of_for_you")}</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section id="how-to-stake" className="mb-12">
            <Card>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <Lightbulb className="h-5 w-5 mr-2 text-primary" />
                  <CardTitle>{t("how_to_stake")}</CardTitle>
                </div>
                <CardDescription>
                  {t("a_step-by-step_guide_to_staking_your_crypto_assets")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {t("step_1_choose_a_staking_pool")}
                </h3>
                <p>
                  {t("browse_our_available_investment_goals")}.{" "}
                  {t("each_pool_has_stake_amount")}.
                </p>
                <Link href="/staking/pool" className="mt-2">
                  <Button>{t("browse_staking_pools")}</Button>
                </Link>

                <h3 className="text-lg font-semibold mt-6">
                  {t("step_2_review_pool_details")}
                </h3>
                <p>{t("before_staking_carefully_details_including")}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t("apr_(annual_percentage_rate)")}</li>
                  <li>
                    {t("lock_period_(how_long_your_assets_will_be_staked)")}
                  </li>
                  <li>{t("minimum_and_maximum_stake_amounts")}</li>
                  <li>{t("early_withdrawal_fees")}</li>
                  <li>{t("reward_distribution_schedule")}</li>
                  <li>{t("auto-compounding_options")}</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">
                  {t("step_3_enter_staking_amount")}
                </h3>
                <p>
                  {t("enter_the_amount_you_wish_to_stake")}.{" "}
                  {t("the_platform_will_staking_amount")}.
                </p>

                <h3 className="text-lg font-semibold mt-6">
                  {t("step_4_confirm_and_stake")}
                </h3>
                <p>
                  {t("review_your_staking_the_transaction")}.{" "}
                  {t("your_assets_will_distribution_schedule")}.
                </p>

                <h3 className="text-lg font-semibold mt-6">
                  {t("step_5_monitor_your_positions")}
                </h3>
                <p>
                  {t("track_your_staking_your_dashboard")}.{" "}
                  {t("you_can_view_completed_stakes")}.
                </p>
                <Link href="/staking/dashboard" className="mt-2">
                  <Button variant="outline">{t("go_to_dashboard")}</Button>
                </Link>
              </CardContent>
            </Card>
          </section>

          <section id="rewards" className="mb-12">
            <Card>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                  <CardTitle>{t("understanding_rewards")}</CardTitle>
                </div>
                <CardDescription>
                  {t("how_staking_rewards_work_and_how_theyre_calculated")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {t("reward_calculation")}
                </h3>
                <p>{t("staking_rewards_are_main_factors")}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t("your_staked_amount")}</li>
                  <li>{t("the_pools_apr_(annual_percentage_rate)")}</li>
                  <li>{t("the_duration_of_your_stake")}</li>
                </ul>
                <p className="mt-4">
                  {t("the_basic_formula_for_calculating_rewards_is")}
                </p>
                <div className="p-4 bg-muted rounded-lg font-mono text-sm">
                  {t("rewards_=_staked_365)")}
                </div>

                <h3 className="text-lg font-semibold mt-6">
                  {t("reward_distribution")}
                </h3>
                <p>{t("rewards_are_distributed_can_be")}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>{t("daily")}</strong>
                    {t("rewards_are_distributed_every_24_hours")}
                  </li>
                  <li>
                    <strong>{t("weekly")}</strong>
                    {t("rewards_are_distributed_every_7_days")}
                  </li>
                  <li>
                    <strong>{t("monthly")}</strong>
                    {t("rewards_are_distributed_every_30_days")}
                  </li>
                  <li>
                    <strong>{t("end_of_term")}</strong>
                    {t("all_rewards_are_period_ends")}
                  </li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">
                  {t("Auto-Compounding")}
                </h3>
                <p>
                  {t("some_pools_offer_higher_returns")}.{" "}
                  {t("with_auto-compounding_your_stated_rate")}.
                </p>

                <h3 className="text-lg font-semibold mt-6">
                  {t("claiming_rewards")}
                </h3>
                <p>
                  {t("for_pools_without_your_dashboard")}.{" "}
                  {t("claimed_rewards_are_or_restaked")}.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="risks" className="mb-12">
            <Card>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <Shield className="h-5 w-5 mr-2 text-primary" />
                  <CardTitle>{t("risks_and_considerations")}</CardTitle>
                </div>
                <CardDescription>
                  {t("important_factors_to_consider_before_staking")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {t("market_volatility")}
                </h3>
                <p>
                  {t("while_staking_can_market_conditions")}.{" "}
                  {t("your_staked_amount_may_change")}.
                </p>

                <h3 className="text-lg font-semibold mt-6">
                  {t("lock_period")}
                </h3>
                <p>
                  {t("when_you_stake_specified_period")}.{" "}
                  {t("early_withdrawal_is_a_fee")}.{" "}
                  {t("consider_your_liquidity_lock_period")}.
                </p>

                <h3 className="text-lg font-semibold mt-6">
                  {t("smart_contract_risks")}
                </h3>
                <p>
                  {t("staking_involves_smart_inherent_risks")}.{" "}
                  {t("while_our_contracts_contract_technology")}.{" "}
                  {t("we_implement_multiple_this_risk")}.
                </p>

                <h3 className="text-lg font-semibold mt-6">
                  {t("regulatory_considerations")}
                </h3>
                <p>
                  {t("cryptocurrency_regulations_vary_are_evolving")}.{" "}
                  {t("changes_in_regulatory_staking_operations")}.{" "}
                  {t("stay_informed_about_the_regulations_in_your_region")}.
                </p>

                <h3 className="text-lg font-semibold mt-6">
                  {t("risk_mitigation")}
                </h3>
                <p>{t("to_mitigate_risks_consider")}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t("diversifying_your_staking_and_cryptocurrencies")}</li>
                  <li>
                    {t("starting_with_smaller_amounts_to_test_the_platform")}
                  </li>
                  <li>
                    {t("regularly_monitoring_your_positions_and_the_market")}
                  </li>
                  <li>{t("only_staking_what_specified_period")}</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section id="faq" className="mb-12">
            <Card>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <HelpCircle className="h-5 w-5 mr-2 text-primary" />
                  <CardTitle>{t("frequently_asked_questions")}</CardTitle>
                </div>
                <CardDescription>
                  {t("common_questions_about_staking")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="general">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">{t("General")}</TabsTrigger>
                    <TabsTrigger value="technical">
                      {t("Technical")}
                    </TabsTrigger>
                    <TabsTrigger value="rewards">{t("Rewards")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="mt-6">
                    <div className="space-y-4">
                      <div className="border-b pb-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {t("is_there_a_minimum_amount_i_need_to_stake")}
                        </h3>
                        <p className="text-muted-foreground">
                          {t("yes_each_staking_stake_requirement")}.{" "}
                          {t(
                            "This is clearly displayed on the pool details page"
                          )}
                          . {t("minimum_stakes_can_range_from_as_little_as")}.{" "}
                          {t("01_btc_to_the_cryptocurrency")}.
                        </p>
                      </div>

                      <div className="border-b pb-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {t("can_i_withdraw_period_ends")}
                        </h3>
                        <p className="text-muted-foreground">
                          {t("yes_you_can_withdrawal_fee")}.{" "}
                          {t("the_fee_percentage_staked_amount")}.
                        </p>
                      </div>

                      <div className="border-b pb-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {t("is_staking_safe")}
                        </h3>
                        <p className="text-muted-foreground">
                          {t("staking_through_our_in_place")}.{" "}
                          {t("however_like_all_some_risks")}.{" "}
                          {t("we_implement_industry-leading_your_assets")}.
                        </p>
                      </div>

                      <div className="border-b pb-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {t("do_i_need_technical_knowledge_to_stake")}
                        </h3>
                        <p className="text-muted-foreground">
                          {t("no_our_platform_technical_knowledge")}.{" "}
                          {t("we_handle_all_investment_strategy")}.
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="technical" className="mt-6">
                    <div className="space-y-4">
                      <div className="border-b pb-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {t("how_does_the_staking_process_work_technically")}
                        </h3>
                        <p className="text-muted-foreground">
                          {t("when_you_stake_blockchain_networks")}.{" "}
                          {t(
                            "These validators participate_stakers proportionally"
                          )}
                          .
                        </p>
                      </div>

                      <div className="border-b pb-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {t("what_happens_to_my_staked_assets")}
                        </h3>
                        <p className="text-muted-foreground">
                          {t("your_staked_assets_smart_contracts")}.{" "}
                          {t("they_are_used_your_property")}.{" "}
                          {t("the_smart_contracts_upon_withdrawal")}.
                        </p>
                      </div>

                      <div className="border-b pb-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {t("are_my_staked_assets_insured")}
                        </h3>
                        <p className="text-muted-foreground">
                          {t("we_maintain_insurance_of_protection")}.{" "}
                          {t("however_this_insurance_potential_losses")}.{" "}
                          {t("we_recommend_reviewing_coverage_information")}.
                        </p>
                      </div>

                      <div className="border-b pb-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {t("what_security_measures_are_in_place")}
                        </h3>
                        <p className="text-muted-foreground">
                          {t("our_security_measures_security_team")}.{" "}
                          {t("we_also_maintain_security_breach")}.
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="rewards" className="mt-6">
                    <div className="space-y-4">
                      <div className="border-b pb-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {t("how_are_staking_rewards_calculated")}
                        </h3>
                        <p className="text-muted-foreground">
                          {t("staking_rewards_are_your_stake")}.{" "}
                          {t("the_basic_formula_365)")}.{" "}
                          {t("for_pools_with_compound_effect")}.
                        </p>
                      </div>

                      <div className="border-b pb-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {t("when_do_i_receive_my_rewards")}
                        </h3>
                        <p className="text-muted-foreground">
                          {t("reward_distribution_schedules_vary_by_pool")}.{" "}
                          {t("some_pools_distribute_staking_period")}.{" "}
                          {t("the_distribution_schedule_details_page")}.
                        </p>
                      </div>

                      <div className="border-b pb-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {t("can_i_reinvest_my_rewards")}
                        </h3>
                        <p className="text-muted-foreground">
                          {t("yes_you_can_your_returns")}.{" "}
                          {t("some_pools_offer_your_rewards")}.{" "}
                          {t("for_pools_without_them_again")}.
                        </p>
                      </div>

                      <div className="border-b pb-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {t("are_staking_rewards_taxable")}
                        </h3>
                        <p className="text-muted-foreground">
                          {t("in_most_jurisdictions_taxable_income")}.{" "}
                          {t("however_tax_regulations_to_change")}.{" "}
                          {t("we_recommend_consulting_your_situation")}.{" "}
                          {t("we_provide_transaction_tax_reporting")}.
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </section>

          <div className="bg-primary text-primary-foreground p-8 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">
              {t("ready_to_start_earning")}
            </h2>
            <p className="mb-6">{t("now_that_you_passive_income")}.</p>
            <Link href="/staking/pool">
              <Button size="lg" variant="secondary">
                {t("explore_staking_pools")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
