"use client";

import { useState, useEffect } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const sections = [
  {
    id: "intro",
    title: "Introduction to Binary Trading",
    icon: <BookOpen className="w-5 h-5 text-white" />,
    color: "bg-blue-500",
  },
  {
    id: "how-it-works",
    title: "How Binary Options Work",
    icon: <TrendingUp className="w-5 h-5 text-white" />,
    color: "bg-emerald-500",
  },
  {
    id: "strategies",
    title: "Trading Strategies",
    icon: <Lightbulb className="w-5 h-5 text-white" />,
    color: "bg-amber-500",
  },
  {
    id: "risk",
    title: "Risk Management",
    icon: <AlertTriangle className="w-5 h-5 text-white" />,
    color: "bg-red-500",
  },
  {
    id: "platform",
    title: "Platform Guide",
    icon: <Zap className="w-5 h-5 text-white" />,
    color: "bg-purple-500",
  },
];

export default function GuideModal({ isOpen, onClose }: GuideModalProps) {
  const t = useTranslations("binary/components/guide/guide-modal");

  // Content for each section (moved inside component to access t)
  const sectionContent = {
    intro: [
      {
        title: "Welcome to Binary Trading",
        content: (
          <div className="space-y-4">
            <div className="aspect-video relative rounded-md overflow-hidden mb-6">
              <Image
                src="/binary-options-chart.png"
                alt="Binary trading chart"
                width={800}
                height={450}
                className="object-cover"
              />
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              {t("binary_options_are_specific_timeframe")}.{" "}
              {t("the_name_binary_your_investment")}.
            </p>
            <div className="bg-gray-100 dark:bg-zinc-900 p-4 rounded-lg border border-gray-200 dark:border-zinc-800">
              <h4 className="font-semibold text-[#F7941D] mb-2">
                {t("quick_overview")}
              </h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <div className="min-w-5 mt-1 mr-2">•</div>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {t("predict")}
                    </span>
                    {t("will_the_price_go_up_or_down")}
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="min-w-5 mt-1 mr-2">•</div>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {t("choose")}
                    </span>
                    {t("select_an_expiry_time")}
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="min-w-5 mt-1 mr-2">•</div>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {t("trade")}
                    </span>
                    {t("place_your_trade_and_wait_for_the_outcome")}
                  </div>
                </li>
              </ul>
            </div>
          </div>
        ),
      },
      // Additional intro steps would go here
    ],
    "how-it-works": [
      {
        title: "The Mechanics of Binary Options",
        content: (
          <div className="space-y-4">
            <div className="aspect-video relative rounded-md overflow-hidden mb-6">
              <Image
                src="/binary-options-mechanics.png"
                alt="Binary options mechanics"
                width={800}
                height={450}
                className="object-cover"
              />
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              {t("binary_options_trading_and_outcomes")}.{" "}
              {t("you_select_an_your_trade")}.
            </p>
            <div className="space-y-3">
              <div className="bg-gray-100 dark:bg-zinc-900 p-3 rounded-lg border border-gray-200 dark:border-zinc-800">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  1. {t("select_an_asset")}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {t("choose_from_a_or_indices")}.
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-zinc-900 p-3 rounded-lg border border-gray-200 dark:border-zinc-800">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  2. {t("choose_direction")}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {t("predict_whether_the_expiry_time")}.
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-zinc-900 p-3 rounded-lg border border-gray-200 dark:border-zinc-800">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  3. {t("set_expiry_time")}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {t("select_when_your_several_hours")}.
                </p>
              </div>
            </div>
          </div>
        ),
      },
      // Additional how-it-works steps would go here
    ],
    strategies: [
      {
        title: "Fundamental Trading Strategies",
        content: (
          <div className="space-y-4">
            <div className="aspect-video relative rounded-md overflow-hidden mb-6">
              <Image
                src="/binary-options-patterns.png"
                alt="Trading strategies"
                width={800}
                height={450}
                className="object-cover"
              />
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              {t("successful_binary_options_solid_strategy")}.{" "}
              {t("here_are_some_traders_use")}
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-gray-100 dark:bg-zinc-900 p-3 rounded-lg border border-gray-200 dark:border-zinc-800">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {t("trend_following")}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {t("identify_and_trade_market_trend")}.{" "}
                  {t("use_moving_averages_to_confirm_trend_direction")}.
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-zinc-900 p-3 rounded-lg border border-gray-200 dark:border-zinc-800">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {t("range_trading")}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {t("identify_support_and_to_reverse")}.{" "}
                  {t("buy_calls_at_support_and_puts_at_resistance")}.
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-zinc-900 p-3 rounded-lg border border-gray-200 dark:border-zinc-800">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {t("news_trading")}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {t("trade_based_on_asset_prices")}.
                </p>
              </div>
            </div>
          </div>
        ),
      },
      // Additional strategies steps would go here
    ],
    risk: [
      {
        title: "Risk Management Fundamentals",
        content: (
          <div className="space-y-4">
            <div className="aspect-video relative rounded-md overflow-hidden mb-6">
              <Image
                src="/trading-risk-management.png"
                alt="Risk management"
                width={800}
                height={450}
                className="object-cover"
              />
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              {t("effective_risk_management_options_trading")}.{" "}
              {t("without_it_even_eventually_fail")}.
            </p>
            <div className="bg-gray-100 dark:bg-zinc-900 p-4 rounded-lg border border-gray-200 dark:border-zinc-800">
              <h4 className="font-semibold text-[#F7941D] mb-2">
                {t("the_1%_rule")}
              </h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {t("never_risk_more_single_trade")}.{" "}
                {t("this_ensures_that_your_account")}.
              </p>
              <div className="mt-3 p-3 bg-gray-50 dark:bg-black rounded-lg">
                <div className="text-sm">{t("example_calculation")}</div>
                <div className="font-mono text-sm mt-1">
                  <div>{t("account_balance_$1000")}</div>
                  <div>{t("maximum_risk_per_trade_(1%)_$10")}</div>
                  <div>{t("maximum_risk_per_trade_(2%)_$20")}</div>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      // Additional risk steps would go here
    ],
    platform: [
      {
        title: "Platform Overview",
        content: (
          <div className="space-y-4">
            <div className="aspect-video relative rounded-md overflow-hidden mb-6">
              <Image
                src="/binary-options-platform.png"
                alt="Platform overview"
                width={800}
                height={450}
                className="object-cover"
              />
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              {t("our_binary_trading_and_features")}.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-gray-100 dark:bg-zinc-900 p-3 rounded-lg border border-gray-200 dark:border-zinc-800">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {t("chart_area")}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {t("the_main_chart_displays_price_movement_over_time")}.{" "}
                  {t("you_can_customize_the_market")}.
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-zinc-900 p-3 rounded-lg border border-gray-200 dark:border-zinc-800">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {t("trading_panel")}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {t("located_to_the_direction_(call_put)")}.
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-zinc-900 p-3 rounded-lg border border-gray-200 dark:border-zinc-800">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {t("asset_selector")}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {t("located_at_the_and_indices")}.
                </p>
              </div>
            </div>
          </div>
        ),
      },
      // Additional platform steps would go here
    ],
  };

  // Component state and logic
  const [activeSection, setActiveSection] = useState("intro");
  const [step, setStep] = useState(0);
  const { theme } = useTheme();

  // Calculate total steps dynamically based on actual content
  const totalSteps = Object.values(sectionContent).reduce(
    (total, sectionSteps) => {
      return total + sectionSteps.length;
    },
    0
  );

  // Reset to first step when section changes
  useEffect(() => {
    setStep(0);
  }, [activeSection]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const handleNextStep = () => {
    const currentSectionContent =
      sectionContent[activeSection as keyof typeof sectionContent];
    if (step < currentSectionContent.length - 1) {
      setStep(step + 1);
    } else {
      // Move to next section
      const currentIndex = sections.findIndex((s) => s.id === activeSection);
      if (currentIndex < sections.length - 1) {
        setActiveSection(sections[currentIndex + 1].id);
      }
    }
  };

  const handlePrevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      // Move to previous section
      const currentIndex = sections.findIndex((s) => s.id === activeSection);
      if (currentIndex > 0) {
        setActiveSection(sections[currentIndex - 1].id);
        // Set to last step of previous section
        const prevSectionContent =
          sectionContent[
            sections[currentIndex - 1].id as keyof typeof sectionContent
          ];
        setStep(prevSectionContent.length - 1);
      }
    }
  };

  // Calculate current step number across all sections
  const calculateCurrentStep = () => {
    let currentStep = 1;
    for (let i = 0; i < sections.length; i++) {
      const sectionId = sections[i].id;
      if (sectionId === activeSection) {
        currentStep += step;
        break;
      } else {
        currentStep +=
          sectionContent[sectionId as keyof typeof sectionContent].length;
      }
    }
    return currentStep;
  };

  const currentSectionContent =
    sectionContent[activeSection as keyof typeof sectionContent];
  const currentContent = currentSectionContent[step];
  const currentStepNumber = calculateCurrentStep();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-black rounded-lg shadow-2xl border border-gray-200 dark:border-zinc-800 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-[#F7941D]">
            {t("binary_trading_guide")}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close guide"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 dark:border-zinc-800 overflow-y-auto bg-gray-50 dark:bg-black">
            <nav className="p-3">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className={`w-full text-left p-3 rounded-lg mb-2 flex items-center transition-colors ${
                    activeSection === section.id
                      ? "bg-gray-200 dark:bg-zinc-800 text-gray-900 dark:text-white"
                      : "hover:bg-gray-100 dark:hover:bg-zinc-900 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <div className={`mr-3 p-2 rounded-md ${section.color}`}>
                    {section.icon}
                  </div>
                  <span className="font-medium">{section.title}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-black">
            <div className="flex-1 overflow-y-auto p-5 md:p-6">
              <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                {currentContent.title}
              </h3>
              {currentContent.content}
            </div>

            {/* Navigation buttons */}
            <div className="p-5 border-t border-gray-200 dark:border-zinc-800 flex justify-between items-center">
              <button
                onClick={handlePrevStep}
                disabled={activeSection === sections[0].id && step === 0}
                className={`flex items-center px-4 py-2 rounded-lg ${
                  activeSection === sections[0].id && step === 0
                    ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    : "bg-gray-200 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-white"
                }`}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t("Previous")}
              </button>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t("Step")}
                {currentStepNumber}
                {t("of")}
                {totalSteps}
              </div>

              <button
                onClick={handleNextStep}
                disabled={
                  activeSection === sections[sections.length - 1].id &&
                  step === currentSectionContent.length - 1
                }
                className={`flex items-center px-4 py-2 rounded-lg ${
                  activeSection === sections[sections.length - 1].id &&
                  step === currentSectionContent.length - 1
                    ? "bg-gray-300 dark:bg-zinc-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    : "bg-[#F7941D] hover:bg-[#FF8A00] text-white"
                }`}
              >
                {t("Next")}
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
