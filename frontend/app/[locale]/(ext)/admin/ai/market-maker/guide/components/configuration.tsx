"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslations } from "next-intl";

export default function ConfigurationSection() {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-bold text-muted-800 dark:text-muted-100 mb-4">
            {t("configuration_guide")}
          </h2>
          <p className="text-muted-600 dark:text-muted-400">
            {t("understanding_how_to_configure_your_ai")} {t("this_guide_covers_all_configurable_parameters")}
          </p>
        </CardContent>
      </Card>

      {/* Global Settings */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center">
              <Icon icon="mdi:cog" className="w-5 h-5 text-indigo-500" />
            </div>
            <h3 className="text-lg font-semibold text-muted-800 dark:text-muted-100">
              {t("global_settings")}
            </h3>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="trading-controls">
              <AccordionTrigger>{t("trading_controls")}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-2">
                  <div className="border-l-2 border-indigo-500 pl-4">
                    <h5 className="font-medium text-muted-800 dark:text-muted-100">{t("trading_enabled")}</h5>
                    <p className="text-sm text-muted-500 mt-1">
                      {t("master_switch_for_all_ai_market_maker")} {t("when_disabled_all_bots_stop_and")}
                    </p>
                    <p className="text-xs text-purple-500 mt-2">
                      <Icon icon="mdi:lightbulb" className="w-3 h-3 inline mr-1" />
                      {t("use_this_for_scheduled_maintenance_or")}
                    </p>
                  </div>

                  <div className="border-l-2 border-amber-500 pl-4">
                    <h5 className="font-medium text-muted-800 dark:text-muted-100">{t("global_pause")}</h5>
                    <p className="text-sm text-muted-500 mt-1">
                      {t("pauses_all_markets_without_fully_stopping_them")} {t("bots_remain_ready_and_can_resume_quickly")}
                    </p>
                    <p className="text-xs text-purple-500 mt-2">
                      <Icon icon="mdi:lightbulb" className="w-3 h-3 inline mr-1" />
                      {t("use_during_high_volatility_periods_or")}
                    </p>
                  </div>

                  <div className="border-l-2 border-red-500 pl-4">
                    <h5 className="font-medium text-muted-800 dark:text-muted-100">{tExt("maintenance_mode")}</h5>
                    <p className="text-sm text-muted-500 mt-1">
                      {t("completely_halts_trading_and_prevents_any")} {t("use_for_system_updates")}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="bot-limits">
              <AccordionTrigger>{t("bot_limits")}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-2">
                  <div className="border-l-2 border-purple-500 pl-4">
                    <h5 className="font-medium text-muted-800 dark:text-muted-100">{t("max_concurrent_bots")}</h5>
                    <p className="text-sm text-muted-500 mt-1">
                      {t("maximum_number_of_bots_running_simultaneously")}
                    </p>
                    <div className="mt-2 p-2 bg-muted-100 dark:bg-muted-800 rounded text-xs">
                      <strong>{tCommon("recommended")}</strong> {t("n_50_for_small_deployments_100")}
                    </div>
                  </div>

                  <div className="border-l-2 border-purple-500 pl-4">
                    <h5 className="font-medium text-muted-800 dark:text-muted-100">{t("bot_intervals")}</h5>
                    <p className="text-sm text-muted-500 mt-1">
                      {t("min_max_time_between_bot_actions")} {t("lower_values_more_activity_but_higher_server_load")}
                    </p>
                    <div className="mt-2 p-2 bg-muted-100 dark:bg-muted-800 rounded text-xs">
                      <strong>{tCommon("recommended")}</strong> {t("min_1000ms_max_30000ms")}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="risk-management">
              <AccordionTrigger>{tCommon("risk_management")}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-2">
                  <div className="border-l-2 border-red-500 pl-4">
                    <h5 className="font-medium text-muted-800 dark:text-muted-100">{tExt("max_daily_loss")}</h5>
                    <p className="text-sm text-muted-500 mt-1">
                      {t("percentage_of_tvl_if_daily_losses")}
                    </p>
                    <div className="mt-2 p-2 bg-red-500/10 dark:bg-red-500/20 rounded text-xs text-red-600 dark:text-red-400">
                      <strong>{t("warning")}</strong> {t("setting_this_too_high_can_result")}
                    </div>
                  </div>

                  <div className="border-l-2 border-amber-500 pl-4">
                    <h5 className="font-medium text-muted-800 dark:text-muted-100">{t("volatility_threshold")}</h5>
                    <p className="text-sm text-muted-500 mt-1">
                      {t("price_volatility_percentage_that_triggers_automatic")} {t("protects_during_flash_crashes")}
                    </p>
                    <div className="mt-2 p-2 bg-muted-100 dark:bg-muted-800 rounded text-xs">
                      <strong>{tCommon("recommended")}</strong> {t("n_5_15_depending_on_asset_volatility")}
                    </div>
                  </div>

                  <div className="border-l-2 border-green-500 pl-4">
                    <h5 className="font-medium text-muted-800 dark:text-muted-100">{t("min_liquidity")}</h5>
                    <p className="text-sm text-muted-500 mt-1">
                      {t("minimum_usd_value_in_pool_before_trading_can_start")} {t("prevents_trading_with_insufficient_capital")}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Market Settings */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center">
              <Icon icon="mdi:chart-line" className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-muted-800 dark:text-muted-100">
              {t("market_settings")}
            </h3>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="target-price">
              <AccordionTrigger>{t("target_price_configuration")}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-2">
                  <p className="text-sm text-muted-600 dark:text-muted-400">
                    {t("the_target_price_is_the_price")} {t("bots_will_place_orders_to_gradually")}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-muted-50 dark:bg-muted-800/50 rounded-lg">
                      <h5 className="font-medium text-sm text-muted-800 dark:text-muted-100">{t("price_range_min_max")}</h5>
                      <p className="text-xs text-muted-500 mt-1">
                        {t("acceptable_range_for_price_movement_bots")}
                      </p>
                    </div>
                    <div className="p-3 bg-muted-50 dark:bg-muted-800/50 rounded-lg">
                      <h5 className="font-medium text-sm text-muted-800 dark:text-muted-100">{t("aggression_level")}</h5>
                      <p className="text-xs text-muted-500 mt-1">
                        {t("how_aggressively_to_move_toward_target_options")} <strong>Conservative</strong> ({t("slow_natural_movement")}),{" "}
                        <strong>Moderate</strong> ({t("balanced_approach_or")}), or <strong>Aggressive</strong> ({t("faster_but_less_natural")}).
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg">
                    <div className="flex gap-2">
                      <Icon icon="mdi:information" className="w-5 h-5 text-purple-500 shrink-0" />
                      <div>
                        <h5 className="font-medium text-sm text-purple-700 dark:text-purple-300">{t("when_to_update_target_price")}</h5>
                        <ul className="text-xs text-purple-600 dark:text-purple-400 mt-1 list-disc list-inside">
                          <li>{t("when_fundamental_value_of_the_asset_changes")}</li>
                          <li>{t("to_respond_to_market_conditions")}</li>
                          <li>{t("during_planned_price_adjustments")}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="spread-config">
              <AccordionTrigger>{t("spread_configuration")}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-2">
                  <p className="text-sm text-muted-600 dark:text-muted-400">
                    {t("spread_is_the_difference_between_the")} {t("its_how_market_makers_profit_and")}
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3">{t("spread_type")}</th>
                          <th className="text-left py-2 px-3">Range</th>
                          <th className="text-left py-2 px-3">{t("best_for")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2 px-3 font-medium">Tight</td>
                          <td className="py-2 px-3">0.1% - 0.3%</td>
                          <td className="py-2 px-3 text-muted-500">{t("stable_assets_high_liquidity")}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 px-3 font-medium">Normal</td>
                          <td className="py-2 px-3">0.3% - 0.8%</td>
                          <td className="py-2 px-3 text-muted-500">{t("most_markets_recommended")} ({tCommon("recommended")})</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 px-3 font-medium">Wide</td>
                          <td className="py-2 px-3">0.8% - 2%</td>
                          <td className="py-2 px-3 text-muted-500">{t("volatile_assets_low_liquidity")}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium">{t("very_wide")}</td>
                          <td className="py-2 px-3">2% - 5%</td>
                          <td className="py-2 px-3 text-muted-500">{t("exotic_illiquid_assets")}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="volume-config">
              <AccordionTrigger>{t("volume_configuration")}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium text-sm text-muted-800 dark:text-muted-100">{t("max_daily_volume")}</h5>
                      <p className="text-xs text-muted-500 mt-1">
                        {t("maximum_volume_that_can_be_generated")}
                      </p>
                      <p className="text-xs text-green-500 mt-2">
                        {t("set_based_on_your_markets_natural")}
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium text-sm text-muted-800 dark:text-muted-100">{t("real_liquidity")}</h5>
                      <p className="text-xs text-muted-500 mt-1">
                        {t("percentage_of_orders_that_use_real")} {t("higher_more_capital_efficient")}
                      </p>
                      <p className="text-xs text-amber-500 mt-2">
                        {t("higher_values_increase_real_profit_loss_exposure")}
                      </p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Pool Settings */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center">
              <Icon icon="mdi:water" className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-muted-800 dark:text-muted-100">
              {t("liquidity_pool_settings")}
            </h3>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-600 dark:text-muted-400">
              {t("the_liquidity_pool_is_the_capital")} {t("proper_pool_configuration_is_essential_for")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon="mdi:currency-usd" className="w-5 h-5 text-green-500" />
                  <h5 className="font-medium text-muted-800 dark:text-muted-100">{t("base_balance")}</h5>
                </div>
                <p className="text-xs text-muted-500">
                  {t("amount_of_base_currency_e_g")}
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon="mdi:currency-usd" className="w-5 h-5 text-purple-500" />
                  <h5 className="font-medium text-muted-800 dark:text-muted-100">{t("quote_balance")}</h5>
                </div>
                <p className="text-xs text-muted-500">
                  {t("amount_of_quote_currency_e_g")}
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon="mdi:scale-balance" className="w-5 h-5 text-amber-500" />
                  <h5 className="font-medium text-muted-800 dark:text-muted-100">{t("balance_ratio")}</h5>
                </div>
                <p className="text-xs text-muted-500">
                  {t("recommended_50_50_split_for_neutral")}
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg">
              <div className="flex gap-3">
                <Icon icon="mdi:alert" className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <h5 className="font-medium text-sm text-amber-700 dark:text-amber-300">{t("pool_sizing_tips")}</h5>
                  <ul className="text-xs text-amber-600 dark:text-amber-400 mt-1 list-disc list-inside">
                    <li>{t("start_with_small_pools_and_increase")}</li>
                    <li>{t("pool_should_be_large_enough_to")}</li>
                    <li>{t("keep_reserve_funds_outside_the_pool")}</li>
                    <li>{t("monitor_p_l_daily_and_adjust_pool_size_accordingly")}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
