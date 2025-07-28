"use client";

import type React from "react";

import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBuilderStore } from "@/store/builder-store";
import { createEmptyRow, generateId } from "@/store/builder-store";
import type { Column, Element } from "@/types/builder";
import { LabeledInput, LabeledSelect } from "./ui-components";
import { useTranslations } from "next-intl";

// Define element types as string constants since ElementType enum is only for types
const ELEMENT_TYPES = {
  SECTION: "section",
  ROW: "row",
  COLUMN: "column",
  HEADING: "heading",
  TEXT: "text",
  IMAGE: "image",
  BUTTON: "button",
  DIVIDER: "divider",
  SPACER: "spacer",
  ICON: "icon",
  LIST: "list",
  CONTAINER: "container",
};

export function StructureTab() {
  const t = useTranslations("dashboard");
  const builderStore = useBuilderStore();
  const selectedElementId = builderStore.selectedElementId;
  const selectedSectionId = builderStore.selectedSectionId;
  const selectedRowId = builderStore.selectedRowId;
  const selectedColumnId = builderStore.selectedColumnId;
  const selectedElement = selectedElementId
    ? builderStore.getSelectedElement()
    : null;

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedElement || !selectedElementId) return;
      builderStore.updateElement(selectedElementId, {
        ...selectedElement,
        settings: {
          ...selectedElement.settings,
          name: e.target.value,
        },
      });
    },
    [selectedElement, selectedElementId, builderStore]
  );

  const handleTagChange = useCallback(
    (value: string) => {
      if (!selectedElement || !selectedElementId) return;
      builderStore.updateElement(selectedElementId, {
        ...selectedElement,
        settings: {
          ...selectedElement.settings,
          tag: value,
        },
      });
    },
    [selectedElement, selectedElementId, builderStore]
  );

  const handleAddRow = useCallback(() => {
    if (!selectedSectionId) return;
    // Create a new row with proper structure
    const newRow = createEmptyRow();
    builderStore.addRow(selectedSectionId, newRow);
  }, [selectedSectionId, builderStore]);

  const handleAddColumn = useCallback(() => {
    if (!selectedSectionId || !selectedRowId) return;
    // Create a new column with proper structure
    const newColumn: Column = {
      id: generateId("column"),
      width: 100,
      elements: [],
      settings: {
        paddingTop: 15,
        paddingRight: 15,
        paddingBottom: 15,
        paddingLeft: 15,
      },
    };
    builderStore.addColumn(selectedSectionId, selectedRowId, newColumn);
  }, [selectedSectionId, selectedRowId, builderStore]);

  const handleAddElement = useCallback(
    (type: string) => {
      if (!selectedSectionId || !selectedColumnId) return;
      // Create a new element with proper structure
      const newElement: Element = {
        id: generateId("element"),
        type,
        settings: {
          name: `New ${type}`,
          width: "100%",
          height: "auto",
        },
      };
      builderStore.addElement(newElement);
    },
    [selectedSectionId, selectedColumnId, builderStore]
  );

  const handleDuplicate = useCallback(() => {
    if (!selectedElementId) return;
    builderStore.duplicateElement(selectedElementId);
  }, [selectedElementId, builderStore]);

  const handleDelete = useCallback(() => {
    if (!selectedElementId) return;
    builderStore.deleteElement(selectedElementId);
  }, [selectedElementId, builderStore]);

  const handleMoveUp = useCallback(() => {
    if (
      !selectedElementId ||
      !selectedSectionId ||
      !selectedRowId ||
      !selectedColumnId
    )
      return;
    // For simplicity, we'll use reorderElement which is designed for this purpose
    builderStore.reorderElement(
      selectedElementId,
      selectedSectionId,
      selectedRowId,
      selectedColumnId,
      "up"
    );
  }, [
    selectedElementId,
    selectedSectionId,
    selectedRowId,
    selectedColumnId,
    builderStore,
  ]);

  const handleMoveDown = useCallback(() => {
    if (
      !selectedElementId ||
      !selectedSectionId ||
      !selectedRowId ||
      !selectedColumnId
    )
      return;
    // For simplicity, we'll use reorderElement which is designed for this purpose
    builderStore.reorderElement(
      selectedElementId,
      selectedSectionId,
      selectedRowId,
      selectedColumnId,
      "down"
    );
  }, [
    selectedElementId,
    selectedSectionId,
    selectedRowId,
    selectedColumnId,
    builderStore,
  ]);

  const tagOptions = useMemo(() => {
    if (!selectedElement) return [];

    switch (selectedElement.type) {
      case ELEMENT_TYPES.SECTION:
        return [
          { value: "section", label: "Section" },
          { value: "div", label: "Div" },
          { value: "header", label: "Header" },
          { value: "footer", label: "Footer" },
          { value: "main", label: "Main" },
          { value: "article", label: "Article" },
          { value: "aside", label: "Aside" },
          { value: "nav", label: "Nav" },
        ];
      case ELEMENT_TYPES.ROW:
        return [
          { value: "div", label: "Div" },
          { value: "section", label: "Section" },
        ];
      case ELEMENT_TYPES.COLUMN:
        return [
          { value: "div", label: "Div" },
          { value: "section", label: "Section" },
        ];
      default:
        return [];
    }
  }, [selectedElement]);

  if (!selectedElement) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>{t("select_an_element_to_edit_its_structure")}</p>
      </div>
    );
  }

  const elementName = selectedElement.settings?.name || "Unnamed Element";
  const elementTag = selectedElement.settings?.tag || "div";

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <LabeledInput
            id="element-name"
            label="Name"
            value={elementName}
            onChange={handleNameChange}
            placeholder="Element name"
            tooltip="A descriptive name to help identify this element"
          />

          <LabeledSelect
            id="element-tag"
            label="HTML Tag"
            value={elementTag}
            onValueChange={handleTagChange}
            options={tagOptions}
            tooltip="The HTML tag to use for this element"
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs">{t("Actions")}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={handleDuplicate}
            >
              {t("Duplicate")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              {t("Delete")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={handleMoveUp}
            >
              {t("move_up")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={handleMoveDown}
            >
              {t("move_down")}
            </Button>
          </div>
        </div>

        <Separator />

        {selectedElement.type === ELEMENT_TYPES.SECTION && (
          <div className="space-y-2">
            <Label className="text-xs">{t("add_content")}</Label>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={handleAddRow}
              >
                {t("add_row")}
              </Button>
            </div>
          </div>
        )}

        {selectedElement.type === ELEMENT_TYPES.ROW && (
          <div className="space-y-2">
            <Label className="text-xs">{t("add_content")}</Label>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={handleAddColumn}
              >
                {t("add_column")}
              </Button>
            </div>
          </div>
        )}

        {selectedElement.type === ELEMENT_TYPES.COLUMN && (
          <div className="space-y-2">
            <Label className="text-xs">{t("add_content")}</Label>
            <Tabs defaultValue="layout" className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-8">
                <TabsTrigger value="layout" className="text-xs">
                  {t("Layout")}
                </TabsTrigger>
                <TabsTrigger value="content" className="text-xs">
                  {t("Content")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="layout" className="mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleAddElement(ELEMENT_TYPES.ROW)}
                  >
                    {t("Row")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleAddElement(ELEMENT_TYPES.CONTAINER)}
                  >
                    {t("Container")}
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="content" className="mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleAddElement(ELEMENT_TYPES.HEADING)}
                  >
                    {t("Heading")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleAddElement(ELEMENT_TYPES.TEXT)}
                  >
                    {t("Text")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleAddElement(ELEMENT_TYPES.IMAGE)}
                  >
                    {t("Image")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleAddElement(ELEMENT_TYPES.BUTTON)}
                  >
                    {t("Button")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleAddElement(ELEMENT_TYPES.DIVIDER)}
                  >
                    {t("Divider")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleAddElement(ELEMENT_TYPES.SPACER)}
                  >
                    {t("Spacer")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleAddElement(ELEMENT_TYPES.ICON)}
                  >
                    {t("Icon")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleAddElement(ELEMENT_TYPES.LIST)}
                  >
                    {t("List")}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

export default StructureTab;
