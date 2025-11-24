"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldCard } from "./field-card";
import {
  PanelLeftClose,
  Search,
  Layers,
  LayoutList,
  Grid,
  LayoutGrid,
  ListChecks,
  Sparkles,
  Inbox,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface FieldLibraryPanelProps {
  handleAddField: (type: KycFieldType) => void;
  setLeftSidebarOpen: (open: boolean) => void;
}

// Define field types with more detailed information
const fieldTypes = [
  {
    type: "TEXT",
    label: "Text",
    icon: Search, // Using Search as a placeholder for Type
    description: "Single line text input",
    category: "basic",
    examples: ["Name", "Title", "Username"],
  },
  {
    type: "TEXTAREA",
    label: "Textarea",
    icon: Search, // Using Search as a placeholder for AlignLeft
    description: "Multi-line text input",
    category: "basic",
    examples: ["Bio", "Comments", "Description"],
  },
  {
    type: "SELECT",
    label: "Dropdown",
    icon: Search, // Using Search as a placeholder for List
    description: "Select from options",
    category: "choice",
    examples: ["Country", "Status", "Category"],
  },
  {
    type: "CHECKBOX",
    label: "Checkboxes",
    icon: Search, // Using Search as a placeholder for CheckSquare
    description: "Multiple selection",
    category: "choice",
    examples: ["Interests", "Features", "Options"],
  },
  {
    type: "RADIO",
    label: "Radio Buttons",
    icon: Search, // Using Search as a placeholder for Radio
    description: "Single selection",
    category: "choice",
    examples: ["Gender", "Yes/No", "Size"],
  },
  {
    type: "DATE",
    label: "Date",
    icon: Search, // Using Search as a placeholder for CalendarDays
    description: "Date picker",
    category: "special",
    examples: ["Birth date", "Appointment", "Deadline"],
  },
  {
    type: "FILE",
    label: "File Upload",
    icon: Search, // Using Search as a placeholder for FileInput
    description: "File upload field",
    category: "special",
    examples: ["ID Document", "Profile Picture", "Resume"],
  },
  {
    type: "NUMBER",
    label: "Number",
    icon: Search, // Using Search as a placeholder for Hash
    description: "Numeric input",
    category: "basic",
    examples: ["Age", "Quantity", "Score"],
  },
  {
    type: "EMAIL",
    label: "Email",
    icon: Search, // Using Search as a placeholder for Mail
    description: "Email input",
    category: "contact",
    examples: ["Email address", "Contact email", "Notification email"],
  },
  {
    type: "PHONE",
    label: "Phone",
    icon: Search, // Using Search as a placeholder for Phone
    description: "Phone number input",
    category: "contact",
    examples: ["Mobile number", "Work phone", "Fax"],
  },
  {
    type: "ADDRESS",
    label: "Address",
    icon: Search, // Using Search as a placeholder for MapPin
    description: "Address input",
    category: "contact",
    examples: ["Home address", "Shipping address", "Office location"],
  },
  {
    type: "IDENTITY",
    label: "Identity Verification",
    icon: CreditCard,
    description: "Composite field for identity document verification",
    category: "verification",
    examples: ["Passport", "Driver's License", "National ID"],
  },
];

export function FieldLibraryPanel({
  handleAddField,
  setLeftSidebarOpen,
}: FieldLibraryPanelProps) {
  const t = useTranslations("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const headerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Filter fields based on search query
  const filteredFields = fieldTypes.filter(
    (field) =>
      field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.examples.some((ex) =>
        ex.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  // Group field types by category
  const basicFields = filteredFields.filter(
    (field) => field.category === "basic"
  );
  const choiceFields = filteredFields.filter(
    (field) => field.category === "choice"
  );
  const specialFields = filteredFields.filter(
    (field) => field.category === "special"
  );
  const contactFields = filteredFields.filter(
    (field) => field.category === "contact"
  );
  const verificationFields = filteredFields.filter(
    (field) => field.category === "verification"
  );

  return (
    <div className="flex flex-col h-full">
      <div
        ref={headerRef}
        className="py-3 px-4 border-b border-gray-200 dark:border-zinc-800 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/50 dark:via-indigo-950/50 dark:to-purple-950/50 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 rounded-md shadow-sm">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white">
              {t("field_library")}
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {t("drag_or_click_to_add_fields")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-gray-200 dark:bg-zinc-800 rounded-md p-0.5 flex">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-sm ${
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
              }`}
              aria-label="List view"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-sm ${
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
              }`}
              aria-label="Grid view"
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLeftSidebarOpen(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div
        ref={searchRef}
        className="p-3 bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-200 dark:border-zinc-800"
      >
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-zinc-500" />
          <Input
            placeholder="Search fields..."
            className="pl-9 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div ref={tabsRef} className="w-full">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-gray-100 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 rounded-none h-8.5 w-full grid grid-cols-5 p-0">
            <TabsTrigger
              value="all"
              className="rounded-none data-[state=active]:bg-white data-[state=active]:dark:bg-zinc-800 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
            >
              {t("All")}
            </TabsTrigger>
            <TabsTrigger
              value="basic"
              className="rounded-none data-[state=active]:bg-white data-[state=active]:dark:bg-zinc-800 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
            >
              {t("Basic")}
            </TabsTrigger>
            <TabsTrigger
              value="choice"
              className="rounded-none data-[state=active]:bg-white data-[state=active]:dark:bg-zinc-800 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
            >
              {t("Choice")}
            </TabsTrigger>
            <TabsTrigger
              value="special"
              className="rounded-none data-[state=active]:bg-white data-[state=active]:dark:bg-zinc-800 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
            >
              {t("Special")}
            </TabsTrigger>
            <TabsTrigger
              value="verification"
              className="rounded-none data-[state=active]:bg-white data-[state=active]:dark:bg-zinc-800 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
            >
              {t("Verify")}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="w-full h-[calc(100vh_-_16rem)]">
            <TabsContent
              value="all"
              className="m-0 p-0 data-[state=active]:block"
            >
              <div className="p-4">
                {filteredFields.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="bg-gray-100 dark:bg-zinc-800/80 p-3 rounded-full mb-3">
                      <Search className="h-6 w-6 text-gray-400 dark:text-zinc-400" />
                    </div>
                    <h3 className="text-base font-medium text-gray-700 dark:text-zinc-200 mb-1">
                      {t("no_fields_found")}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-xs">
                      {t("try_adjusting_your_available_fields")}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      onClick={() => setSearchQuery("")}
                    >
                      {t("clear_search")}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <LayoutGrid className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                        <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-200">
                          {t("basic_fields")}
                        </h3>
                      </div>
                      <div
                        className={
                          viewMode === "grid"
                            ? "grid grid-cols-2 gap-3"
                            : "grid grid-cols-1 gap-3"
                        }
                      >
                        {basicFields.map((fieldType) => (
                          <FieldCard
                            key={fieldType.type}
                            fieldType={fieldType}
                            handleAddField={handleAddField}
                            isHovered={hoveredField === fieldType.type}
                            setHovered={setHoveredField}
                            viewMode={viewMode}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <ListChecks className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                        <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-200">
                          {t("choice_fields")}
                        </h3>
                      </div>
                      <div
                        className={
                          viewMode === "grid"
                            ? "grid grid-cols-2 gap-3"
                            : "grid grid-cols-1 gap-3"
                        }
                      >
                        {choiceFields.map((fieldType) => (
                          <FieldCard
                            key={fieldType.type}
                            fieldType={fieldType}
                            handleAddField={handleAddField}
                            isHovered={hoveredField === fieldType.type}
                            setHovered={setHoveredField}
                            viewMode={viewMode}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                        <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-200">
                          {t("special_fields")}
                        </h3>
                      </div>
                      <div
                        className={
                          viewMode === "grid"
                            ? "grid grid-cols-2 gap-3"
                            : "grid grid-cols-1 gap-3"
                        }
                      >
                        {specialFields.map((fieldType) => (
                          <FieldCard
                            key={fieldType.type}
                            fieldType={fieldType}
                            handleAddField={handleAddField}
                            isHovered={hoveredField === fieldType.type}
                            setHovered={setHoveredField}
                            viewMode={viewMode}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Inbox className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                        <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-200">
                          {t("contact_fields")}
                        </h3>
                      </div>
                      <div
                        className={
                          viewMode === "grid"
                            ? "grid grid-cols-2 gap-3"
                            : "grid grid-cols-1 gap-3"
                        }
                      >
                        {contactFields.map((fieldType) => (
                          <FieldCard
                            key={fieldType.type}
                            fieldType={fieldType}
                            handleAddField={handleAddField}
                            isHovered={hoveredField === fieldType.type}
                            setHovered={setHoveredField}
                            viewMode={viewMode}
                          />
                        ))}
                      </div>
                    </div>

                    {verificationFields.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <ShieldCheck className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                          <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-200">
                            {t("verification_fields")}
                          </h3>
                        </div>
                        <div
                          className={
                            viewMode === "grid"
                              ? "grid grid-cols-2 gap-3"
                              : "grid grid-cols-1 gap-3"
                          }
                        >
                          {verificationFields.map((fieldType) => (
                            <FieldCard
                              key={fieldType.type}
                              fieldType={fieldType}
                              handleAddField={handleAddField}
                              isHovered={hoveredField === fieldType.type}
                              setHovered={setHoveredField}
                              viewMode={viewMode}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="basic"
              className="m-0 p-0 data-[state=active]:block"
            >
              <div className="p-4">
                {basicFields.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-gray-500 dark:text-zinc-300">
                      {t("no_basic_fields_match_your_search")}
                    </p>
                  </div>
                ) : (
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-2 gap-3"
                        : "grid grid-cols-1 gap-3"
                    }
                  >
                    {basicFields.map((fieldType) => (
                      <FieldCard
                        key={fieldType.type}
                        fieldType={fieldType}
                        handleAddField={handleAddField}
                        isHovered={hoveredField === fieldType.type}
                        setHovered={setHoveredField}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="choice"
              className="m-0 p-0 data-[state=active]:block"
            >
              <div className="p-4">
                {choiceFields.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-gray-500 dark:text-zinc-300">
                      {t("no_choice_fields_match_your_search")}
                    </p>
                  </div>
                ) : (
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-2 gap-3"
                        : "grid grid-cols-1 gap-3"
                    }
                  >
                    {choiceFields.map((fieldType) => (
                      <FieldCard
                        key={fieldType.type}
                        fieldType={fieldType}
                        handleAddField={handleAddField}
                        isHovered={hoveredField === fieldType.type}
                        setHovered={setHoveredField}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="special"
              className="m-0 p-0 data-[state=active]:block"
            >
              <div className="p-4">
                {specialFields.length === 0 && contactFields.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-gray-500 dark:text-zinc-300">
                      {t("no_special_fields_match_your_search")}
                    </p>
                  </div>
                ) : (
                  <>
                    {specialFields.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                          <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-200">
                            {t("special_fields")}
                          </h3>
                        </div>
                        <div
                          className={
                            viewMode === "grid"
                              ? "grid grid-cols-2 gap-3"
                              : "grid grid-cols-1 gap-3"
                          }
                        >
                          {specialFields.map((fieldType) => (
                            <FieldCard
                              key={fieldType.type}
                              fieldType={fieldType}
                              handleAddField={handleAddField}
                              isHovered={hoveredField === fieldType.type}
                              setHovered={setHoveredField}
                              viewMode={viewMode}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {contactFields.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Inbox className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                          <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-200">
                            {t("contact_fields")}
                          </h3>
                        </div>
                        <div
                          className={
                            viewMode === "grid"
                              ? "grid grid-cols-2 gap-3"
                              : "grid grid-cols-1 gap-3"
                          }
                        >
                          {contactFields.map((fieldType) => (
                            <FieldCard
                              key={fieldType.type}
                              fieldType={fieldType}
                              handleAddField={handleAddField}
                              isHovered={hoveredField === fieldType.type}
                              setHovered={setHoveredField}
                              viewMode={viewMode}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="verification"
              className="m-0 p-0 data-[state=active]:block"
            >
              <div className="p-4">
                {verificationFields.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-gray-500 dark:text-zinc-300">
                      {t("no_verification_fields_match_your_search")}
                    </p>
                  </div>
                ) : (
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-2 gap-3"
                        : "grid grid-cols-1 gap-3"
                    }
                  >
                    {verificationFields.map((fieldType) => (
                      <FieldCard
                        key={fieldType.type}
                        fieldType={fieldType}
                        handleAddField={handleAddField}
                        isHovered={hoveredField === fieldType.type}
                        setHovered={setHoveredField}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
