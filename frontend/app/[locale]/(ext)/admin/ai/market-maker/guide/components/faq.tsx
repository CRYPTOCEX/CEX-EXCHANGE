"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  ChartLine,
  CircleAlert,
  CircleHelp,
  FileText,
  Lightbulb,
  MessagesSquare,
  Settings,
  Sliders,
  Wrench,
} from "lucide-react";

export default function FaqSection() {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const faqCategories = [
    {
      title: t("general_questions"),
      icon: CircleHelp,
      faqs: [
        {
          question: t("what_is_ai_market_maker"),
          answer: t("ai_market_maker_is_an_automated"),
        },
        {
          question: t("is_this_legal"),
          answer: t("market_making_is_a_legitimate_practice"),
        },
        {
          question: t("how_much_capital_do_i_need_to_start"),
          answer: "You can start with as little as $100-500 for testing purposes. For production markets, we recommend starting with at least $1,000-5,000 per market to ensure sufficient liquidity for meaningful trading activity. Larger pools provide more stability and better performance.",
        },
        {
          question: t("can_i_lose_money"),
          answer: t("yes_market_making_involves_risk_while"),
        },
      ],
    },
    {
      title: t("technical_questions"),
      icon: Settings,
      faqs: [
        {
          question: t("how_do_bots_decide_when_to_trade"),
          answer: t("bots_use_a_combination_of_factors"),
        },
        {
          question: t("what_happens_if_the_server_goes_down"),
          answer: t("active_orders_remain_on_the_order"),
        },
        {
          question: t("can_i_run_multiple_markets_simultaneously"),
          answer: t("yes_you_can_run_as_many"),
        },
        {
          question: t("how_does_the_target_price_work"),
          answer: t("the_target_price_is_the_price_1"),
        },
        {
          question: t("whats_the_difference_between_pause_and_stop"),
          answer: t("pause_temporarily_halts_trading_while_keeping"),
        },
      ],
    },
    {
      title: t("configuration_questions"),
      icon: Sliders,
      faqs: [
        {
          question: t("what_spread_should_i_use"),
          answer: t("it_depends_on_the_asset_for"),
        },
        {
          question: t("how_many_bots_should_i_configure_per_market"),
          answer: t("for_most_markets_3_5_bots"),
        },
        {
          question: t("should_i_enable_all_bot_types"),
          answer: t("no_start_simple_market_maker_and"),
        },
        {
          question: t("how_often_should_i_adjust_settings"),
          answer: t("initially_monitor_daily_and_adjust_as"),
        },
      ],
    },
    {
      title: t("performance_p_l"),
      icon: ChartLine,
      faqs: [
        {
          question: t("why_is_my_bot_p_l_showing_zero"),
          answer: t("p_l_is_only_calculated_from_1"),
        },
        {
          question: t("how_is_bot_p_l_calculated_for_spot_trading"),
          answer: "Bots track their 'position' (inventory) and 'average entry price'. P&L is realized when closing positions: If a bot bought 100 tokens at $50 (long position), then sells them at $55, the realized P&L is ($55-$50) × 100 = +$500. P&L is only recorded when positions are closed, not when opened.",
        },
        {
          question: t("what_does_position_mean_for_bots"),
          answer: t("position_tracks_the_bots_inventory_imbalance"),
        },
        {
          question: t("whats_the_difference_between_ai_trades"),
          answer: t("ai_trades_are_internal_trades_between"),
        },
        {
          question: t("why_do_my_bots_have_many_trades_but_0_win_rate"),
          answer: t("win_rate_is_calculated_from_real"),
        },
        {
          question: t("whats_a_good_target_achievement_rate"),
          answer: t("a_target_achievement_rate_of_60"),
        },
      ],
    },
    {
      title: t("troubleshooting"),
      icon: CircleAlert,
      faqs: [
        {
          question: t("my_market_wont_start_what_should_i_check"),
          answer: t("check_1_pool_has_minimum_required"),
        },
        {
          question: t("bots_are_running_but_no_ai_trades_appearing"),
          answer: t("check_if_bots_have_reached_their"),
        },
        {
          question: t("why_did_my_bots_stop_trading_after_running_fine"),
          answer: t("most_common_cause_bots_reached_their"),
        },
        {
          question: t("price_is_stuck_and_not_moving"),
          answer: t("possible_causes_1_aggression_level_too"),
        },
        {
          question: t("pause_shows_stopped_in_the_ui"),
          answer: t("this_was_a_known_bug_where"),
        },
        {
          question: t("im_seeing_no_orderbook_entry_found_errors"),
          answer: t("this_is_normal_when_stopping_pausing"),
        },
      ],
    },
  ];


  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
              <MessagesSquare className="h-3.5 w-3.5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
                {tCommon('faq_question')}
              </h2>
              <p className="text-muted-foreground mt-1">
                {t("find_answers_to_common_questions_about")} {tExt("cant_find_what_youre_looking_for")} {t("check_the_other_guide_sections_or_contact_support")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search hint */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lightbulb className="w-4 h-4" />
        <span>{t("tip_use_your_browsers_search_ctrl")}</span>
      </div>

      {/* FAQ Categories */}
      {faqCategories.map((category) => (
        <Card key={category.title}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary`}>
                {(() => { const Glyph = category.icon; return <Glyph className="h-3.5 w-3.5" />; })()}
              </span>
              <h3 className="text-lg font-semibold text-foreground">
                {category.title}
              </h3>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {category.faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left">
                    <span className="text-sm font-medium">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground p-2">
                      {faq.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}

      {/* Still have questions */}
      <Card className="bg-muted">
        <CardContent className="pt-6">
          <div className="text-center">
            <CircleHelp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {tExt("still_have_questions")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              {t("if_you_couldnt_find_the_answer")}
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                <span>{t("read_the_full_guide")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>{t("check_system_logs")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wrench className="w-4 h-4" />
                <span>{t("review_troubleshooting")}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
