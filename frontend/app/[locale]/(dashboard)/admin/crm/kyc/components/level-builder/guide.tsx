"use client";

import type React from "react";
import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Zap,
  ChevronRight,
  Layers,
  Settings,
  Eye,
  Save,
  FileCheck,
  DropletsIcon as DragDropIcon,
  ListRestart,
  Workflow,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// Types for our components
interface GuideProps {
  onClose: () => void;
}
interface TabProps {
  id: number;
  name: string;
  icon: React.ReactNode;
}
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "blue" | "purple" | "indigo" | "cyan";
  delay?: number;
}
interface StepItemProps {
  number: number;
  title: string;
  description: string;
  color: "blue" | "green" | "purple";
}
interface BulletItemProps {
  children: React.ReactNode;
  color: "purple" | "indigo" | "cyan" | "blue" | "green";
}
interface FieldTypeProps {
  title: string;
  description: string;
}
interface StatusOptionProps {
  tone: keyof typeof STATUS_DOT;
  title: string;
  description: string;
}

// A level's publication state, which is genuinely a status, so it takes the
// status tokens. Written out in full: the dot used to build its class from a
// hue name at render time, which Tailwind never sees, so it painted nothing.
const STATUS_DOT = {
  draft: "bg-warning",
  published: "bg-success",
  archived: "bg-muted-foreground",
} as const;

/*
 * A guide is furniture, not state. Every card, step number and bullet below
 * used to pick from a per-hue map (blue/purple/indigo/cyan/green) that the
 * palette migration collapsed onto a single token, so the maps ended up using
 * one and the same token for the ground and for the ink — a 1:1 contrast
 * ratio, i.e. invisible content. Nothing here carries status, so the
 * whole family now takes the neutral ramp and the hue only survives as a small
 * accent on icons and bullets. The `color` props are kept on the interfaces so
 * that every call site is unchanged; they are simply no longer consumed.
 */

// Reusable components
const FeatureCard = ({
  icon,
  title,
  description,
  delay = 0,
}: FeatureCardProps) => {
  return (
    <m.div
      initial={{
        y: 20,
        opacity: 0,
      }}
      animate={{
        y: 0,
        opacity: 1,
      }}
      transition={{
        delay,
      }}
      className="bg-surface-2 rounded-lg p-5 border border-border"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-primary/10 text-primary-ink p-2 rounded-full">
          {icon}
        </div>
        <h3 className="font-medium text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </m.div>
  );
};
const StepItem = ({ number, title, description }: StepItemProps) => {
  return (
    <li className="flex items-start gap-3">
      <div className="bg-surface-3 text-foreground rounded-full h-6 w-6 flex items-center justify-center font-medium shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <p className="text-foreground font-medium">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </li>
  );
};
const BulletItem = ({ children }: BulletItemProps) => {
  return (
    <li className="flex items-start gap-2">
      <div className="h-1.5 w-1.5 bg-primary rounded-full shrink-0 mt-2"></div>
      <div className="text-sm text-muted-foreground">{children}</div>
    </li>
  );
};
const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
  color?: "blue" | "purple" | "indigo" | "cyan" | "green";
}) => {
  return (
    <div className="bg-surface-2 text-foreground rounded-lg p-5 border border-border">
      <h4 className="font-medium mb-3">{title}</h4>
      {children}
    </div>
  );
};
const FieldType = ({ title, description }: FieldTypeProps) => (
  <div className="bg-surface-3 p-3 rounded border border-border">
    <p className="font-medium text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground">
      {description}
    </p>
  </div>
);
const StatusOption = ({ tone, title, description }: StatusOptionProps) => (
  <div className="bg-surface-3 p-3 rounded border border-border">
    <div className="flex items-center gap-2 mb-1">
      <div className={`h-2 w-2 rounded-full ${STATUS_DOT[tone]}`}></div>
      <p className="font-medium text-foreground">{title}</p>
    </div>
    <p className="text-xs text-muted-foreground">{description}</p>
  </div>
);
const TabNavigation = ({
  tabs,
  activeTab,
  setActiveTab,
}: {
  tabs: TabProps[];
  activeTab: number;
  setActiveTab: (id: number) => void;
}) => (
  <div className="border-b border-border">
    <div className="flex overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors w-full justify-center",
            activeTab === tab.id
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-primary"
          )}
        >
          {tab.icon}
          {tab.name}
        </button>
      ))}
    </div>
  </div>
);
const TabFooter = ({
  activeTab,
  setActiveTab,
  onClose,
  isLastTab,
}: {
  activeTab: number;
  setActiveTab: (id: number) => void;
  onClose: () => void;
  isLastTab: boolean;
}) => {
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  return (
    <div className="flex justify-between">
      <Button variant="outline" onClick={() => setActiveTab(activeTab - 1)}>
        Back
      </Button>
      {isLastTab ? (
        <Button
          onClick={onClose}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {tCommon("get_started")}
        </Button>
      ) : (
        <Button
          onClick={() => setActiveTab(activeTab + 1)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {tCommon("next")}:{" "}
          {activeTab === 0
            ? tDashboard("adding_fields")
            : activeTab === 1
              ? tDashboard("editing_fields")
              : activeTab === 2
                ? tCommon("preview")
                : tCommon("publishing")}{" "}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

// Tab content components
const OverviewTab = ({
  setActiveTab,
}: {
  setActiveTab: (id: number) => void;
}) => {
  const tDashboard = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  return (
    <m.div
      key="overview"
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      className="space-y-6"
    >
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative">
          <m.div
            initial={{
              scale: 0.8,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            transition={{
              delay: 0.2,
              duration: 0.5,
            }}
            className="bg-primary p-4 rounded-full mb-4"
          >
            <Workflow className="h-10 w-10 text-primary-foreground" />
          </m.div>
          <m.div
            initial={{
              scale: 0,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            transition={{
              delay: 0.5,
              duration: 0.3,
            }}
            className="absolute -top-2 -right-2 bg-warning rounded-full p-1"
          >
            <Sparkles className="h-4 w-4 text-warning-foreground" />
          </m.div>
        </div>
        <h2 className="text-2xl font-bold text-primary-ink">
          {tCommon("welcome_to_the_level_builder")}
        </h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          {tDashboard("create_powerful_customized_verification_levels_for")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FeatureCard
          icon={<DragDropIcon className="h-5 w-5" />}
          title={tDashboard("drag_drop_interface")}
          description={`${tDashboard("easily_build_forms_by_dragging_fields")} ${tDashboard("arrange_them_in_any_order_with")}`}
          color="blue"
          delay={0.2}
        />
        <FeatureCard
          icon={<Settings className="h-5 w-5" />}
          title={tDashboard("advanced_customization")}
          description={tDashboard("configure_field_properties_validation_rules_and")}
          color="purple"
          delay={0.3}
        />
        <FeatureCard
          icon={<Eye className="h-5 w-5" />}
          title={tCommon("live_preview")}
          description={`${tDashboard("see_exactly_how_your_form_will")} ${tDashboard("test_functionality_before_publishing")}`}
          color="indigo"
          delay={0.4}
        />
        <FeatureCard
          icon={<ListRestart className="h-5 w-5" />}
          title={tDashboard("ready_to_use_templates")}
          description={tDashboard("start_quickly_with_pre_built_templates")}
          color="cyan"
          delay={0.5}
        />
      </div>

      <div className="flex justify-center mt-4">
        <Button
          onClick={() => setActiveTab(1)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {tCommon("get_started")} <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </m.div>
  );
};
const AddingFieldsTab = () => {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  return (
    <m.div
      key="adding-fields"
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      className="space-y-6"
    >
      <h3 className="text-xl font-semibold text-foreground">
        {tCommon("adding_fields_to_your_form")}
      </h3>

      <SectionCard title={t("drag_drop_method")} color="blue">
        <ol className="space-y-4">
          <StepItem
            number={1}
            title={t("select_a_field_type")}
            description={t("browse_the_field_library_in_the")}
            color="blue"
          />
          <StepItem
            number={2}
            title={t("drag_to_canvas")}
            description={t("click_and_drag_the_field_from")}
            color="blue"
          />
          <StepItem
            number={3}
            title={t("position_your_field")}
            description={`${t("drop_the_field_where_you_want")} ${t("you_can_reorder_fields_by_dragging_them_up_or_down")}`}
            color="blue"
          />
        </ol>
      </SectionCard>

      <SectionCard title={t("available_field_types")} color="indigo">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <FieldType title="Text" description={t("single_line_text_input")} />
          <FieldType title="Textarea" description={t("multi_line_text_input")} />
          <FieldType title="Select" description={t("dropdown_selection")} />
          <FieldType title="Checkbox" description={tCommon("multiple_selection")} />
          <FieldType title="Radio" description={t("single_selection")} />
          <FieldType title="File" description={t("document_upload")} />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {t("and_more_date_number_email_phone")}…
        </p>
      </SectionCard>
    </m.div>
  );
};
const EditingTab = () => {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  return (
    <m.div
      key="editing"
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      className="space-y-6"
    >
      <h3 className="text-xl font-semibold text-foreground">
        {tCommon("editing_field_properties")}
      </h3>

      <SectionCard title={t("basic_properties")} color="purple">
        <ul className="space-y-3">
          <BulletItem color="purple">
            <p className="text-foreground font-medium">
              {tCommon("label_description")}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("set_the_field_label_that_users")}
            </p>
          </BulletItem>
          <BulletItem color="purple">
            <p className="text-foreground font-medium">
              {tCommon("required_field")}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("toggle_whether_the_field_is_mandatory")}
            </p>
          </BulletItem>
          <BulletItem color="purple">
            <p className="text-foreground font-medium">
              {tCommon("placeholder_text")}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("add_example_text_that_appears_in")}
            </p>
          </BulletItem>
        </ul>
      </SectionCard>

      <SectionCard title={t("advanced_settings")} color="indigo">
        <ul className="space-y-3">
          <BulletItem color="indigo">
            <p className="text-foreground font-medium">
              {tCommon("validation_rules")}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("set_rules_for_data_format_minimum")}
            </p>
          </BulletItem>
          <BulletItem color="indigo">
            <p className="text-foreground font-medium">
              {tCommon("conditional_logic")}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("make_fields_appear_or_hide_based")}
            </p>
          </BulletItem>
          <BulletItem color="indigo">
            <p className="text-foreground font-medium">
              {tCommon("field_options")}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("for_select_checkbox_and_radio_fields")}
            </p>
          </BulletItem>
        </ul>
      </SectionCard>
    </m.div>
  );
};
const PreviewTab = () => {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  return (
    <m.div
      key="preview"
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      className="space-y-6"
    >
      <h3 className="text-xl font-semibold text-foreground">
        {tCommon("preview_testing")}
      </h3>

      <SectionCard title={t("live_preview_mode")} color="cyan">
        <p className="text-sm text-muted-foreground mb-4">
          {t("the_preview_mode_lets_you_see")}
        </p>

        <div className="bg-surface-3 rounded-lg p-4 border border-border mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {tCommon("preview_features")}
              </span>
            </div>
          </div>
          <ul className="space-y-2">
            <BulletItem color="cyan">
              {tCommon("test_form_validation_and_error_messages")}
            </BulletItem>
            <BulletItem color="cyan">
              {tCommon("see_conditional_logic_in_action")}
            </BulletItem>
            <BulletItem color="cyan">
              {tCommon("preview_on_different_device_sizes")}
            </BulletItem>
            <BulletItem color="cyan">{tCommon("test_the_complete_user_flow")}</BulletItem>
          </ul>
        </div>

        <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
          <div className="bg-primary text-primary-foreground p-2 rounded-full">
            <Zap className="h-4 w-4" />
          </div>
          <p className="text-sm text-foreground">
            <span className="font-medium">{t("pro_tip_1")}:</span> {t("always_test_your_form_thoroughly_in")}
          </p>
        </div>
      </SectionCard>

      <SectionCard title={t("responsive_testing")} color="blue">
        <p className="text-sm text-muted-foreground mb-4">
          {t("ensure_your_form_looks_great_on")}
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <div className="flex flex-col items-center">
            <div className="bg-surface-3 p-2 rounded-lg mb-2 w-10 h-16 flex items-center justify-center">
              <div className="w-6 h-10 border-2 border-border-strong rounded-sm"></div>
            </div>
            <span className="text-xs text-muted-foreground">
              Mobile
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="bg-surface-3 p-2 rounded-lg mb-2 w-14 h-16 flex items-center justify-center">
              <div className="w-10 h-8 border-2 border-border-strong rounded-sm"></div>
            </div>
            <span className="text-xs text-muted-foreground">
              Tablet
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="bg-surface-3 p-2 rounded-lg mb-2 w-16 h-16 flex items-center justify-center">
              <div className="w-12 h-8 border-2 border-border-strong rounded-sm"></div>
            </div>
            <span className="text-xs text-muted-foreground">
              Desktop
            </span>
          </div>
        </div>
      </SectionCard>
    </m.div>
  );
};
const PublishingTab = () => {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  return (
    <m.div
      key="publishing"
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      className="space-y-6"
    >
      <h3 className="text-xl font-semibold text-foreground">
        {tCommon("saving_publishing")}
      </h3>

      <SectionCard title={t("publishing_workflow")} color="green">
        <ol className="space-y-4">
          <StepItem
            number={1}
            title={t("save_your_level")}
            description={`${t("click_the_save_changes_button_to")} ${t("this_will_save_your_work_but")}`}
            color="green"
          />
          <StepItem
            number={2}
            title={t("set_status_to_published")}
            description={t("change_the_level_status_from_draft")}
            color="green"
          />
          <StepItem
            number={3}
            title={t("monitor_update")}
            description={`${t("track_user_submissions_and_make_updates")} ${t("you_can_archive_levels_that_are_no_longer_in_use")}`}
            color="green"
          />
        </ol>
      </SectionCard>

      <SectionCard title={t("status_options")} color="blue">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatusOption
            tone="draft"
            title="Draft"
            description={t("in_development_not_visible_to_users")}
          />
          <StatusOption
            tone="published"
            title="Published"
            description={t("live_and_available_to_users")}
          />
          <StatusOption
            tone="archived"
            title="Archived"
            description={tCommon("no_longer_in_use_but_preserved")}
          />
        </div>
      </SectionCard>

      <SectionCard title={tCommon("best_practices")} color="indigo">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-primary text-primary-foreground p-2 rounded-full">
            <Save className="h-5 w-5" />
          </div>
        </div>
        <ul className="space-y-2">
          <BulletItem color="green">
            {tCommon("test_thoroughly_in_preview_mode_before_publishing")}
          </BulletItem>
          <BulletItem color="green">
            {t("create_clear_descriptive_and_instructions")}
          </BulletItem>
          <BulletItem color="green">
            {tCommon("use_validation_rules_to_ensure_data_quality")}
          </BulletItem>
          <BulletItem color="green">
            {t("keep_forms_concise_essential_information")}
          </BulletItem>
        </ul>
      </SectionCard>
    </m.div>
  );
};

// Main component
export function Guide({ onClose }: GuideProps) {
  const [activeTab, setActiveTab] = useState<number>(0);
  const tabs = [
    {
      id: 0,
      name: "Overview",
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      id: 1,
      name: "Adding Fields",
      icon: <Layers className="h-4 w-4" />,
    },
    {
      id: 2,
      name: "Editing",
      icon: <Settings className="h-4 w-4" />,
    },
    {
      id: 3,
      name: "Preview",
      icon: <Eye className="h-4 w-4" />,
    },
    {
      id: 4,
      name: "Publishing",
      icon: <FileCheck className="h-4 w-4" />,
    },
  ];

  // Render the appropriate tab content based on activeTab
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <OverviewTab setActiveTab={setActiveTab} />;
      case 1:
        return <AddingFieldsTab />;
      case 2:
        return <EditingTab />;
      case 3:
        return <PreviewTab />;
      case 4:
        return <PublishingTab />;
      default:
        return <OverviewTab setActiveTab={setActiveTab} />;
    }
  };
  return (
    <div className="flex-1 overflow-auto">
      <m.div
        initial={{
          opacity: 0,
          y: -10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="mx-auto"
      >
        {/* Tabs */}
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">{renderTabContent()}</AnimatePresence>
        </div>

        {/* Footer navigation */}
        {activeTab > 0 && (
          <TabFooter
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onClose={onClose}
            isLastTab={activeTab === tabs.length - 1}
          />
        )}
      </m.div>
    </div>
  );
}
