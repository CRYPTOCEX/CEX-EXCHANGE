"use client";

import type React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  color: string;
  title: string;
  description: string;
}

// Reusable components
const FeatureCard = ({
  icon,
  title,
  description,
  color,
  delay = 0,
}: FeatureCardProps) => {
  const colorClasses = {
    blue: "from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-blue-100 dark:border-blue-900",
    purple:
      "from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border-purple-100 dark:border-purple-900",
    indigo:
      "from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border-indigo-100 dark:border-indigo-900",
    cyan: "from-cyan-50 to-blue-50 dark:from-cyan-950/40 dark:to-blue-950/40 border-cyan-100 dark:border-cyan-900",
  };
  const iconBgClasses = {
    blue: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
    purple:
      "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400",
    indigo:
      "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400",
    cyan: "bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400",
  };
  const textClasses = {
    blue: "text-blue-800 dark:text-blue-300",
    purple: "text-purple-800 dark:text-purple-300",
    indigo: "text-indigo-800 dark:text-indigo-300",
    cyan: "text-cyan-800 dark:text-cyan-300",
  };
  const descriptionClasses = {
    blue: "text-blue-700 dark:text-blue-400",
    purple: "text-purple-700 dark:text-purple-400",
    indigo: "text-indigo-700 dark:text-indigo-400",
    cyan: "text-cyan-700 dark:text-cyan-400",
  };
  return (
    <motion.div
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
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg p-5 border`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`${iconBgClasses[color]} p-2 rounded-full`}>{icon}</div>
        <h3 className={`font-medium ${textClasses[color]}`}>{title}</h3>
      </div>
      <p className={`text-sm ${descriptionClasses[color]}`}>{description}</p>
    </motion.div>
  );
};
const StepItem = ({ number, title, description, color }: StepItemProps) => {
  const colorClasses = {
    blue: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
    green: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
    purple:
      "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
  };
  const titleClasses = {
    blue: "text-blue-800 dark:text-blue-200",
    green: "text-green-800 dark:text-green-200",
    purple: "text-purple-800 dark:text-purple-200",
  };
  const descriptionClasses = {
    blue: "text-blue-700 dark:text-blue-400",
    green: "text-green-700 dark:text-green-400",
    purple: "text-purple-700 dark:text-purple-400",
  };
  return (
    <li className="flex items-start gap-3">
      <div
        className={`${colorClasses[color]} rounded-full h-6 w-6 flex items-center justify-center font-medium shrink-0 mt-0.5`}
      >
        {number}
      </div>
      <div>
        <p className={`${titleClasses[color]} font-medium`}>{title}</p>
        <p className={`text-sm ${descriptionClasses[color]} mt-1`}>
          {description}
        </p>
      </div>
    </li>
  );
};
const BulletItem = ({ children, color }: BulletItemProps) => {
  const bulletClasses = {
    purple: "bg-purple-100 dark:bg-purple-900 p-1.5",
    indigo: "bg-indigo-100 dark:bg-indigo-900 p-1.5",
    cyan: "h-1.5 w-1.5 bg-cyan-500",
    blue: "h-1.5 w-1.5 bg-blue-500",
    green: "h-5 w-5 flex items-center justify-center shrink-0",
  };
  const dotClasses = {
    purple: "h-2 w-2 bg-purple-500 rounded-full",
    indigo: "h-2 w-2 bg-indigo-500 rounded-full",
    cyan: "",
    blue: "",
    green: "h-1.5 w-1.5 bg-indigo-500 rounded-full",
  };
  const textClasses = {
    purple: "text-purple-800 dark:text-purple-200 font-medium",
    indigo: "text-indigo-800 dark:text-indigo-200 font-medium",
    cyan: "text-xs text-cyan-700 dark:text-cyan-400",
    blue: "text-xs text-blue-700 dark:text-blue-400",
    green: "text-sm text-indigo-700 dark:text-indigo-400",
  };
  return (
    <li className="flex items-start gap-2">
      <div className={`${bulletClasses[color]} rounded-full shrink-0 mt-0.5`}>
        {dotClasses[color] && <div className={dotClasses[color]}></div>}
      </div>
      <div className={textClasses[color]}>{children}</div>
    </li>
  );
};
const SectionCard = ({
  title,
  children,
  color = "blue",
}: {
  title: string;
  children: React.ReactNode;
  color?: "blue" | "purple" | "indigo" | "cyan" | "green";
}) => {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900 text-blue-800 dark:text-blue-300",
    purple:
      "bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900 text-purple-800 dark:text-purple-300",
    indigo:
      "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900 text-indigo-800 dark:text-indigo-300",
    cyan: "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-100 dark:border-cyan-900 text-cyan-800 dark:text-cyan-300",
    green:
      "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900 text-green-800 dark:text-green-300",
  };
  return (
    <div className={`${colorClasses[color]} rounded-lg p-5 border`}>
      <h4 className="font-medium mb-3">{title}</h4>
      {children}
    </div>
  );
};
const FieldType = ({ title, description }: FieldTypeProps) => (
  <div className="bg-white dark:bg-indigo-900/20 p-3 rounded border border-indigo-100 dark:border-indigo-800">
    <p className="font-medium text-indigo-800 dark:text-indigo-300">{title}</p>
    <p className="text-xs text-indigo-600 dark:text-indigo-400">
      {description}
    </p>
  </div>
);
const StatusOption = ({ color, title, description }: StatusOptionProps) => (
  <div className="bg-white dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-800">
    <div className="flex items-center gap-2 mb-1">
      <div className={`h-2 w-2 bg-${color}-500 rounded-full`}></div>
      <p className="font-medium text-blue-800 dark:text-blue-300">{title}</p>
    </div>
    <p className="text-xs text-blue-600 dark:text-blue-400">{description}</p>
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
  <div className="border-b border-gray-200 dark:border-zinc-800">
    <div className="flex overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors w-full justify-center",
            activeTab === tab.id
              ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
              : "text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
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
  return (
    <div className="flex justify-between">
      <Button variant="outline" onClick={() => setActiveTab(activeTab - 1)}>
        Back
      </Button>
      {isLastTab ? (
        <Button
          onClick={onClose}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
        >
          Get Started
        </Button>
      ) : (
        <Button
          onClick={() => setActiveTab(activeTab + 1)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
        >
          Next:{" "}
          {activeTab === 0
            ? "Adding Fields"
            : activeTab === 1
              ? "Editing Fields"
              : activeTab === 2
                ? "Preview"
                : "Publishing"}{" "}
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
  return (
    <motion.div
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
          <motion.div
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
            className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-full mb-4"
          >
            <Workflow className="h-10 w-10 text-white" />
          </motion.div>
          <motion.div
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
            className="absolute -top-2 -right-2 bg-amber-500 rounded-full p-1"
          >
            <Sparkles className="h-4 w-4 text-white" />
          </motion.div>
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Welcome to the Level Builder
        </h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Create powerful, customized verification levels for your KYC process
          with our intuitive drag-and-drop builder.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FeatureCard
          icon={<DragDropIcon className="h-5 w-5" />}
          title="Drag & Drop Interface"
          description="Easily build forms by dragging fields from the library onto your canvas. Arrange them in any order with simple drag and drop."
          color="blue"
          delay={0.2}
        />
        <FeatureCard
          icon={<Settings className="h-5 w-5" />}
          title="Advanced Customization"
          description="Configure field properties, validation rules, and conditional logic to create sophisticated verification flows."
          color="purple"
          delay={0.3}
        />
        <FeatureCard
          icon={<Eye className="h-5 w-5" />}
          title="Live Preview"
          description="See exactly how your form will appear to users with our real-time preview. Test functionality before publishing."
          color="indigo"
          delay={0.4}
        />
        <FeatureCard
          icon={<ListRestart className="h-5 w-5" />}
          title="Ready-to-Use Templates"
          description="Start quickly with pre-built templates for common verification scenarios, then customize to your needs."
          color="cyan"
          delay={0.5}
        />
      </div>

      <div className="flex justify-center mt-4">
        <Button
          onClick={() => setActiveTab(1)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
        >
          Get Started <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};
const AddingFieldsTab = () => {
  return (
    <motion.div
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
      <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-300">
        Adding Fields to Your Form
      </h3>

      <SectionCard title="Drag & Drop Method" color="blue">
        <ol className="space-y-4">
          <StepItem
            number={1}
            title="Select a field type"
            description="Browse the field library in the left sidebar to find the type of field you need."
            color="blue"
          />
          <StepItem
            number={2}
            title="Drag to canvas"
            description="Click and drag the field from the sidebar onto the main canvas area."
            color="blue"
          />
          <StepItem
            number={3}
            title="Position your field"
            description="Drop the field where you want it to appear in the form. You can reorder fields by dragging them up or down."
            color="blue"
          />
        </ol>
      </SectionCard>

      <SectionCard title="Available Field Types" color="indigo">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <FieldType title="Text" description="Single line text input" />
          <FieldType title="Textarea" description="Multi-line text input" />
          <FieldType title="Select" description="Dropdown selection" />
          <FieldType title="Checkbox" description="Multiple selection" />
          <FieldType title="Radio" description="Single selection" />
          <FieldType title="File" description="Document upload" />
        </div>
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-3">
          And more: Date, Number, Email, Phone, Address fields are also
          available.
        </p>
      </SectionCard>
    </motion.div>
  );
};
const EditingTab = () => {
  return (
    <motion.div
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
      <h3 className="text-xl font-semibold text-purple-800 dark:text-purple-300">
        Editing Field Properties
      </h3>

      <SectionCard title="Basic Properties" color="purple">
        <ul className="space-y-3">
          <BulletItem color="purple">
            <p className="text-purple-800 dark:text-purple-200 font-medium">
              Label & Description
            </p>
            <p className="text-sm text-purple-700 dark:text-purple-400 mt-0.5">
              Set the field label that users will see and add an optional
              description for clarity.
            </p>
          </BulletItem>
          <BulletItem color="purple">
            <p className="text-purple-800 dark:text-purple-200 font-medium">
              Required Field
            </p>
            <p className="text-sm text-purple-700 dark:text-purple-400 mt-0.5">
              Toggle whether the field is mandatory for form submission.
            </p>
          </BulletItem>
          <BulletItem color="purple">
            <p className="text-purple-800 dark:text-purple-200 font-medium">
              Placeholder Text
            </p>
            <p className="text-sm text-purple-700 dark:text-purple-400 mt-0.5">
              Add example text that appears in the field before the user enters
              information.
            </p>
          </BulletItem>
        </ul>
      </SectionCard>

      <SectionCard title="Advanced Settings" color="indigo">
        <ul className="space-y-3">
          <BulletItem color="indigo">
            <p className="text-indigo-800 dark:text-indigo-200 font-medium">
              Validation Rules
            </p>
            <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-0.5">
              Set rules for data format, minimum/maximum values, or character
              limits.
            </p>
          </BulletItem>
          <BulletItem color="indigo">
            <p className="text-indigo-800 dark:text-indigo-200 font-medium">
              Conditional Logic
            </p>
            <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-0.5">
              Make fields appear or hide based on values entered in other
              fields.
            </p>
          </BulletItem>
          <BulletItem color="indigo">
            <p className="text-indigo-800 dark:text-indigo-200 font-medium">
              Field Options
            </p>
            <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-0.5">
              For select, checkbox, and radio fields, define the available
              options.
            </p>
          </BulletItem>
        </ul>
      </SectionCard>
    </motion.div>
  );
};
const PreviewTab = () => {
  return (
    <motion.div
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
      <h3 className="text-xl font-semibold text-cyan-800 dark:text-cyan-300">
        Preview & Testing
      </h3>

      <SectionCard title="Live Preview Mode" color="cyan">
        <p className="text-sm text-cyan-700 dark:text-cyan-400 mb-4">
          The preview mode lets you see and interact with your form exactly as
          users will experience it.
        </p>

        <div className="bg-white dark:bg-cyan-900/20 rounded-lg p-4 border border-cyan-200 dark:border-cyan-800 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-sm font-medium text-cyan-800 dark:text-cyan-300">
                Preview Features
              </span>
            </div>
          </div>
          <ul className="space-y-2">
            <BulletItem color="cyan">
              Test form validation and error messages
            </BulletItem>
            <BulletItem color="cyan">
              See conditional logic in action
            </BulletItem>
            <BulletItem color="cyan">
              Preview on different device sizes
            </BulletItem>
            <BulletItem color="cyan">Test the complete user flow</BulletItem>
          </ul>
        </div>

        <div className="flex items-center gap-3 p-3 bg-cyan-100 dark:bg-cyan-900/40 rounded-lg">
          <div className="bg-cyan-200 dark:bg-cyan-800 p-2 rounded-full">
            <Zap className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
          </div>
          <p className="text-sm text-cyan-800 dark:text-cyan-300">
            <span className="font-medium">Pro Tip:</span> Always test your form
            thoroughly in preview mode before publishing.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Responsive Testing" color="blue">
        <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
          Ensure your form looks great on all devices by testing different
          screen sizes.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <div className="flex flex-col items-center">
            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mb-2 w-10 h-16 flex items-center justify-center">
              <div className="w-6 h-10 border-2 border-blue-500 dark:border-blue-400 rounded-sm"></div>
            </div>
            <span className="text-xs text-blue-700 dark:text-blue-400">
              Mobile
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mb-2 w-14 h-16 flex items-center justify-center">
              <div className="w-10 h-8 border-2 border-blue-500 dark:border-blue-400 rounded-sm"></div>
            </div>
            <span className="text-xs text-blue-700 dark:text-blue-400">
              Tablet
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mb-2 w-16 h-16 flex items-center justify-center">
              <div className="w-12 h-8 border-2 border-blue-500 dark:border-blue-400 rounded-sm"></div>
            </div>
            <span className="text-xs text-blue-700 dark:text-blue-400">
              Desktop
            </span>
          </div>
        </div>
      </SectionCard>
    </motion.div>
  );
};
const PublishingTab = () => {
  return (
    <motion.div
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
      <h3 className="text-xl font-semibold text-green-800 dark:text-green-300">
        Saving & Publishing
      </h3>

      <SectionCard title="Publishing Workflow" color="green">
        <ol className="space-y-4">
          <StepItem
            number={1}
            title="Save Your Level"
            description="Click the 'Save Changes' button to store your level configuration. This will save your work but won't make it available to users yet."
            color="green"
          />
          <StepItem
            number={2}
            title="Set Status to Published"
            description="Change the level status from 'Draft' to 'Published' when you're ready to make it available to users."
            color="green"
          />
          <StepItem
            number={3}
            title="Monitor & Update"
            description="Track user submissions and make updates to your level as needed. You can archive levels that are no longer in use."
            color="green"
          />
        </ol>
      </SectionCard>

      <SectionCard title="Status Options" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatusOption
            color="amber"
            title="Draft"
            description="In development, not visible to users"
          />
          <StatusOption
            color="green"
            title="Published"
            description="Live and available to users"
          />
          <StatusOption
            color="gray"
            title="Archived"
            description="No longer in use, but preserved"
          />
        </div>
      </SectionCard>

      <SectionCard title="Best Practices" color="indigo">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-full">
            <Save className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
        <ul className="space-y-2">
          <BulletItem color="green">
            Test thoroughly in preview mode before publishing
          </BulletItem>
          <BulletItem color="green">
            Create clear, descriptive field labels and instructions
          </BulletItem>
          <BulletItem color="green">
            Use validation rules to ensure data quality
          </BulletItem>
          <BulletItem color="green">
            Keep forms concise and focused on essential information
          </BulletItem>
        </ul>
      </SectionCard>
    </motion.div>
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
      <motion.div
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
      </motion.div>
    </div>
  );
}
