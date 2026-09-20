import type { Row } from "@/types/builder";

export const rowTemplates = [
  {
    id: "empty-row",
    name: "Empty Row",
    description: "Start with a blank row",
    columns: [],
    thumbnail: null, // Will be rendered with the RowSkeleton component
  },
  {
    id: "single-column",
    name: "Single Column",
    description: "One full-width column",
    columns: [100],
    thumbnail: null,
  },
  {
    id: "two-columns",
    name: "Two Columns",
    description: "Two equal columns",
    columns: [50, 50],
    thumbnail: null,
  },
  {
    id: "three-columns",
    name: "Three Columns",
    description: "Three equal columns",
    columns: [33.33, 33.33, 33.34],
    thumbnail: null,
  },
  {
    id: "sidebar-left",
    name: "Sidebar Left",
    description: "1/3 + 2/3 columns",
    columns: [33.33, 66.67],
    thumbnail: null,
  },
  {
    id: "sidebar-right",
    name: "Sidebar Right",
    description: "2/3 + 1/3 columns",
    columns: [66.67, 33.33],
    thumbnail: null,
  },
];

export function createRowFromTemplate(
  templateId: string,
  nestingLevel = 1
): Row {
  const newRow: Row = {
    id: `row-${Date.now()}`,
    columns: [],
    settings: {
      gutter: 20,
      paddingTop: 20,
      paddingRight: 0,
      paddingBottom: 20,
      paddingLeft: 0,
      verticalAlign: "top",
    },
    nestingLevel,
  };

  // Only add columns for non-empty templates
  if (templateId !== "empty-row") {
    const template = rowTemplates.find((t) => t.id === templateId);

    if (template && template.columns.length > 0) {
      newRow.columns = template.columns.map((width, index) => ({
        id: `column-${Date.now()}-${index + 1}`,
        width,
        elements: [],
        nestingLevel,
      }));
    } else {
      // Fallback to previous implementation
      switch (templateId) {
        case "single-column":
          newRow.columns = [
            {
              id: `column-${Date.now()}`,
              width: 100,
              elements: [],
              nestingLevel,
            },
          ];
          break;
        case "two-columns":
          newRow.columns = [
            {
              id: `column-${Date.now()}-1`,
              width: 50,
              elements: [],
              nestingLevel,
            },
            {
              id: `column-${Date.now()}-2`,
              width: 50,
              elements: [],
              nestingLevel,
            },
          ];
          break;
        case "three-columns":
          newRow.columns = [
            {
              id: `column-${Date.now()}-1`,
              width: 33.33,
              elements: [],
              nestingLevel,
            },
            {
              id: `column-${Date.now()}-2`,
              width: 33.33,
              elements: [],
              nestingLevel,
            },
            {
              id: `column-${Date.now()}-3`,
              width: 33.34,
              elements: [],
              nestingLevel,
            },
          ];
          break;
        case "sidebar-left":
          newRow.columns = [
            {
              id: `column-${Date.now()}-1`,
              width: 33.33,
              elements: [],
              nestingLevel,
            },
            {
              id: `column-${Date.now()}-2`,
              width: 66.67,
              elements: [],
              nestingLevel,
            },
          ];
          break;
        case "sidebar-right":
          newRow.columns = [
            {
              id: `column-${Date.now()}-1`,
              width: 66.67,
              elements: [],
              nestingLevel,
            },
            {
              id: `column-${Date.now()}-2`,
              width: 33.33,
              elements: [],
              nestingLevel,
            },
          ];
          break;
      }
    }
  }

  return newRow;
}
