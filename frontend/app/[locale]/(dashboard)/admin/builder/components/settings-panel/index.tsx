"use client";
import { useState, useEffect } from "react";
import { useBuilderStore } from "@/store/builder-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, SettingsIcon } from "lucide-react";
import PanelHeader from "./ui/panel-header";
import ContentTab from "./tabs/content-tab";
import DesignTab from "./tabs/design-tab";
import AdvancedTab from "./tabs/advanced-tab";
import StructureTab from "./tabs/structure-tab";
import { Tabs } from "./ui/tabs";
import "./styles.css";
import { useTranslations } from "next-intl";

// Define the types of elements that can be selected
type SelectedItemType = "element" | "section" | "row" | "column" | null;

// Component to render when nothing is selected
function EmptyStatePanel({
  toggleAddSectionModal,
}: {
  toggleAddSectionModal: () => void;
}) {
  const t = useTranslations("dashboard");
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
      <div className="mb-3 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
        <SettingsIcon className="h-6 w-6 text-zinc-400 dark:text-zinc-400" />
      </div>
      <h3 className="text-base font-medium mb-1 dark:text-zinc-300">
        {t("no_element_selected")}
      </h3>
      <p className="text-xs text-muted-foreground dark:text-zinc-400 mb-4">
        {t("select_an_element_new_element")}.
      </p>
      <Button
        onClick={toggleAddSectionModal}
        className="bg-purple-600 hover:bg-purple-700 h-8 text-xs px-3 text-white dark:text-white"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        {t("add_section")}
      </Button>
    </div>
  );
}

// Component to render the settings tabs
function SettingsTabs({
  selectedItemType,
  selectedElement,
  selectedSection,
  selectedRowData,
  selectedColumnData,
  settings,
  onSettingChange,
  onElementUpdate,
}: {
  selectedItemType: SelectedItemType;
  selectedElement: any;
  selectedSection: any;
  selectedRowData: any;
  selectedColumnData: any;
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
  onElementUpdate: (updatedElement: any) => void;
}) {
  const tabs = [
    { id: "content", label: "Content" },
    { id: "design", label: "Design" },
    { id: "advanced", label: "Advanced" },
  ];

  return (
    <Tabs defaultTab="content" tabs={tabs} className="flex-1 flex flex-col">
      {(activeTab) => (
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="max-w-full overflow-hidden">
              {activeTab === "content" && (
                <div className="space-y-4 max-w-full overflow-hidden">
                  {selectedItemType === "element" ? (
                    <ContentTab
                      element={selectedElement}
                      settings={settings}
                      onSettingChange={onSettingChange}
                      onElementUpdate={onElementUpdate}
                    />
                  ) : (
                    // The StructureTab component uses the builder store directly,
                    // so we don't need to pass any props
                    <StructureTab />
                  )}
                </div>
              )}

              {activeTab === "design" && (
                <div className="max-w-full overflow-hidden">
                  <DesignTab
                    settings={settings}
                    onSettingChange={onSettingChange}
                    structureType={
                      selectedItemType === "element"
                        ? undefined
                        : (selectedItemType as "section" | "row" | "column")
                    }
                    elementType={
                      selectedItemType === "element" && selectedElement
                        ? selectedElement.type
                        : undefined
                    }
                  />
                </div>
              )}

              {activeTab === "advanced" && (
                <div className="space-y-4 max-w-full overflow-hidden">
                  <AdvancedTab
                    elementId={
                      selectedElement?.id ||
                      selectedSection?.id ||
                      selectedRowData?.row?.id ||
                      selectedColumnData?.column?.id ||
                      ""
                    }
                    settings={settings}
                    onSettingChange={onSettingChange}
                    structureType={
                      selectedItemType === "element"
                        ? undefined
                        : (selectedItemType as "section" | "row" | "column")
                    }
                    elementType={
                      selectedItemType === "element" && selectedElement
                        ? selectedElement.type
                        : undefined
                    }
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </Tabs>
  );
}

export default function ElementSettingsPanel() {
  const t = useTranslations("dashboard");
  const {
    selectedElementId,
    selectedSectionId,
    selectedRowId,
    selectedColumnId,
    getSelectedElement,
    getSelectedSection,
    getSelectedRow,
    getSelectedColumn,
    updateElement,
    closeSettingsPanel,
    duplicateElement,
    deleteElement,
    toggleAddSectionModal,
    isPreviewMode,
  } = useBuilderStore();

  const selectedElement = getSelectedElement();
  const selectedSection = getSelectedSection();
  const selectedRowData = getSelectedRow();
  const selectedColumnData = getSelectedColumn();

  const [settings, setSettings] = useState<Record<string, any>>({});

  // Determine what type of item is selected
  const getSelectedItemType = (): SelectedItemType => {
    if (selectedElementId) return "element";
    if (selectedColumnId) return "column";
    if (selectedRowId) return "row";
    if (selectedSectionId) return "section";
    return null;
  };

  const selectedItemType = getSelectedItemType();

  // Update settings when selection changes
  useEffect(() => {
    if (selectedElement) {
      setSettings(selectedElement.settings || {});
    } else if (selectedSection) {
      setSettings(selectedSection.settings || {});
    } else if (selectedRowData && selectedRowData.row) {
      setSettings(selectedRowData.row.settings || {});
    } else if (selectedColumnData && selectedColumnData.column) {
      setSettings(selectedColumnData.column.settings || {});
    }
  }, [selectedElement, selectedSection, selectedRowData, selectedColumnData]);

  // Handle setting changes
  const handleSettingChange = (key: string, value: any) => {
    if (selectedElement) {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);
      updateElement(selectedElementId!, {
        ...selectedElement,
        settings: updatedSettings,
      });
    } else if (selectedSection) {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);
      useBuilderStore.getState().updateSection(selectedSectionId!, {
        ...selectedSection,
        settings: updatedSettings,
      });
    } else if (selectedRowData) {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);
      useBuilderStore
        .getState()
        .updateRow(selectedRowData.section.id, selectedRowData.row.id, {
          ...selectedRowData.row,
          settings: updatedSettings,
        });
    } else if (selectedColumnData) {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);
      useBuilderStore
        .getState()
        .updateColumn(
          selectedColumnData.section.id,
          selectedColumnData.row.id,
          selectedColumnData.column.id,
          {
            ...selectedColumnData.column,
            settings: updatedSettings,
          }
        );
    }
  };

  // Get the title for the panel header
  const getPanelTitle = () => {
    switch (selectedItemType) {
      case "element":
        return selectedElement?.type || "Element";
      case "section":
        return "Section";
      case "row":
        return "Row";
      case "column":
        return "Column";
      default:
        return "Element";
    }
  };

  // Handle element duplication
  const handleDuplicate = () => {
    if (selectedItemType === "element" && selectedElementId) {
      duplicateElement(selectedElementId);
    }
    // Add handlers for other types if needed
  };

  // Handle element deletion
  const handleDelete = () => {
    if (selectedItemType === "element" && selectedElementId) {
      deleteElement(selectedElementId);
    }
    // Add handlers for other types if needed
  };

  // Don't render the settings panel in preview mode
  if (isPreviewMode) {
    return null;
  }

  // Empty state when nothing is selected
  if (!selectedItemType) {
    return (
      <div className="w-80 border-l bg-white dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-full transition-all duration-300 ease-in-out">
        <div className="flex items-center justify-between p-3 border-b dark:border-zinc-800">
          <h3 className="font-medium text-sm dark:text-zinc-300">
            {t("element_settings")}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeSettingsPanel}
            className="h-6 w-6 p-0"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
        <EmptyStatePanel toggleAddSectionModal={toggleAddSectionModal} />
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-white dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden">
      <PanelHeader
        elementType={getPanelTitle()}
        onClose={closeSettingsPanel}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
      <SettingsTabs
        selectedItemType={selectedItemType}
        selectedElement={selectedElement}
        selectedSection={selectedSection}
        selectedRowData={selectedRowData}
        selectedColumnData={selectedColumnData}
        settings={settings}
        onSettingChange={handleSettingChange}
        onElementUpdate={(updatedElement) =>
          updateElement(selectedElementId!, updatedElement)
        }
      />
    </div>
  );
}
