"use client";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { produce } from "immer";
import {
  createPatch,
  applyPatch,
  createHistoryEntryFromChange,
} from "@/lib/builder/patch-utils";
import type {
  BuilderState,
  Column,
  Element,
  HistoryEntry,
  Page,
  Row,
  Section,
} from "@/types/builder";

/* =====================================================
   Zustand Store Creation with Immer & DevTools
===================================================== */

const useBuilderStore = create<BuilderState>()(
  devtools(
    (set, get) => ({
      pageId: null,
      page: {
        id: "page-1",
        title: "Untitled Page",
        sections: [],
        elements: [],
      },
      history: [],
      future: [],
      historyIndex: -1,
      selectedElementId: null,
      selectedSectionId: null,
      selectedRowId: null,
      selectedColumnId: null,
      isSettingsPanelOpen: false,
      isAddSectionModalOpen: false,
      canUndo: false,
      canRedo: false,
      viewMode: "desktop",
      isPreviewMode: false,
      isLayersOpen: false,
      isSettingsOpen: false,
      currentPageId: null,
      currentPageTitle: null,
      pageSnapshots: {},

      initializeBuilder: (pageId?: string) => {
        set({
          pageId: pageId || null,
          page: {
            id: pageId || "page-1",
            title: "Untitled Page",
            sections: [],
            elements: [],
          },
          history: [],
          future: [],
          historyIndex: -1,
          selectedElementId: null,
          selectedSectionId: null,
          selectedRowId: null,
          selectedColumnId: null,
          isSettingsPanelOpen: true,
          canUndo: false,
          canRedo: false,
          viewMode: "desktop",
          isPreviewMode: false,
          isLayersOpen: false,
          isSettingsOpen: false,
        });
      },

      setPage: (page: Page) => {
        // Ensure sections is always an array to prevent map errors
        const safePage = {
          ...page,
          sections: Array.isArray(page.sections) ? page.sections : [],
          elements: Array.isArray(page.elements) ? page.elements : [],
        };
        set({ page: safePage });
      },

      // --- ELEMENT ACTIONS ---
      addElement: (element: Element) => {
        const { page, history, future, selectedColumnId } = get();
        const elementWithSettings = createElementWithDefaultSettings(element);

        // Create a new state with the element added
        const newPage = produce(page, (draft) => {
          if (selectedColumnId) {
            const registry = new BuilderRegistry(draft.sections);
            const columnInfo = registry.getColumn(selectedColumnId);
            if (columnInfo) {
              columnInfo.column.elements.push(elementWithSettings);
            }
          } else {
            draft.elements = [...(draft.elements || []), elementWithSettings];
          }
        });

        // Create a history entry
        const historyEntry = createHistoryEntryFromChange(
          page,
          newPage,
          "Add element"
        );

        set({
          page: newPage,
          history: historyEntry ? [...history, historyEntry] : history,
          future: [], // Clear future when a new action is performed
          canUndo: history.length > 0 || !!historyEntry,
          canRedo: false,
        });

        setTimeout(() => {
          set({
            selectedElementId: element.id,
            selectedSectionId: null,
            selectedRowId: null,
            selectedColumnId: null,
            isSettingsPanelOpen: true,
            isLayersOpen: false,
            isSettingsOpen: false,
          });
        }, 10);
      },

      updateElement: (id: string, updatedElement: Element) => {
        const { page, history, future } = get();

        // Create a new state with the element updated
        const newPage = produce(page, (draft) => {
          const updatedSections = updateElementRecursive(
            draft.sections,
            id,
            updatedElement
          );
          draft.sections = updatedSections;
        });

        // Create a history entry
        const historyEntry = createHistoryEntryFromChange(
          page,
          newPage,
          "Update element"
        );

        set({
          page: newPage,
          history: historyEntry ? [...history, historyEntry] : history,
          future: [], // Clear future when a new action is performed
          canUndo: history.length > 0 || !!historyEntry,
          canRedo: false,
        });
      },

      duplicateElement: (id: string) => {
        const { page, history, future } = get();

        // Create a new state with the element duplicated
        const newPage = produce(page, (draft) => {
          const registry = new BuilderRegistry(draft.sections);
          const elementInfo = registry.getElement(id);
          let duplicatedElement: Element | undefined;

          if (elementInfo) {
            const { element, column, row, section, parentColumnId } =
              elementInfo;
            duplicatedElement = { ...element, id: generateId("element") };

            if (parentColumnId) {
              draft.sections = updateSectionInArray(
                draft.sections,
                section.id,
                (s) => {
                  return produce(s, (sectionDraft) => {
                    sectionDraft.rows = sectionDraft.rows.map((r) => {
                      if (r.id === row.id) {
                        r.columns = r.columns.map((col) => {
                          if (col.id === parentColumnId && col.rows) {
                            col.rows = col.rows.map((nestedRow) => {
                              if (nestedRow.id === row.id) {
                                const elementIndex =
                                  nestedRow.elements.findIndex(
                                    (el) => el.id === id
                                  );
                                nestedRow.elements.splice(
                                  elementIndex + 1,
                                  0,
                                  duplicatedElement!
                                );
                              }
                              return nestedRow;
                            });
                          }
                          return col;
                        });
                      }
                      return r;
                    });
                  });
                }
              );
            } else {
              const result = duplicateElementRecursive(draft.sections, id);
              draft.sections = result.sections;
              duplicatedElement = result.duplicatedElement;
            }
          } else {
            const result = duplicateElementRecursive(draft.sections, id);
            draft.sections = result.sections;
            duplicatedElement = result.duplicatedElement;

            if (!duplicatedElement) {
              const elementToDuplicate = (draft.elements || []).find(
                (el) => el.id === id
              );
              if (elementToDuplicate) {
                duplicatedElement = {
                  ...elementToDuplicate,
                  id: generateId("element"),
                };
                const originalIndex = (draft.elements || []).findIndex(
                  (el) => el.id === id
                );
                const updatedElements = [...(draft.elements || [])];
                updatedElements.splice(originalIndex + 1, 0, duplicatedElement);
                draft.elements = updatedElements;
              }
            }
          }

          // Store the duplicated element ID for selection after state update
          if (duplicatedElement) {
            // We can't directly modify the draft to add custom properties
            // So we'll handle the selection in the set() call
          }
        });

        // Find the duplicated element ID for selection
        const registry = new BuilderRegistry(newPage.sections);
        const duplicatedElementId = findDuplicatedElementId(page, newPage);

        // Create a history entry
        const historyEntry = createHistoryEntryFromChange(
          page,
          newPage,
          "Duplicate element"
        );

        set({
          page: newPage,
          history: historyEntry ? [...history, historyEntry] : history,
          future: [], // Clear future when a new action is performed
          canUndo: history.length > 0 || !!historyEntry,
          canRedo: false,
          selectedElementId: duplicatedElementId,
          selectedSectionId: null,
          selectedRowId: null,
          selectedColumnId: null,
          isSettingsPanelOpen: true,
        });
      },

      deleteElement: (id: string) => {
        const { page, history, future } = get();

        // Create a new state with the element deleted
        const newPage = produce(page, (draft) => {
          const registry = new BuilderRegistry(draft.sections);
          const elementInfo = registry.getElement(id);

          if (elementInfo) {
            const { column, row, section, parentColumnId } = elementInfo;

            if (parentColumnId) {
              draft.sections = updateSectionInArray(
                draft.sections,
                section.id,
                (s) => {
                  return produce(s, (sectionDraft) => {
                    sectionDraft.rows = sectionDraft.rows.map((r) => {
                      if (r.id === row.id) {
                        r.columns = r.columns.map((col) => {
                          if (col.id === parentColumnId && col.rows) {
                            col.rows = col.rows.map((nestedRow) => {
                              if (nestedRow.id === row.id) {
                                nestedRow.columns = nestedRow.columns.map(
                                  (nestedCol) => {
                                    if (nestedCol.id === column.id) {
                                      nestedCol.elements =
                                        nestedCol.elements.filter(
                                          (el) => el.id !== id
                                        );
                                    }
                                    return nestedCol;
                                  }
                                );
                              }
                              return nestedRow;
                            });
                          }
                          return col;
                        });
                      }
                      return r;
                    });
                  });
                }
              );
            } else {
              draft.sections = updateSectionInArray(
                draft.sections,
                section.id,
                (s) =>
                  updateRowInSection(s, row.id, (r) =>
                    updateColumnInRow(r, column.id, (c) =>
                      removeElementFromColumn(c, id)
                    )
                  )
              );
            }
          } else {
            draft.sections = deleteElementRecursive(draft.sections, id);
            draft.elements = (draft.elements || []).filter(
              (el) => el.id !== id
            );
          }
        });

        // Create a history entry
        const historyEntry = createHistoryEntryFromChange(
          page,
          newPage,
          "Delete element"
        );

        set({
          page: newPage,
          history: historyEntry ? [...history, historyEntry] : history,
          future: [], // Clear future when a new action is performed
          canUndo: history.length > 0 || !!historyEntry,
          canRedo: false,
          selectedElementId: null,
        });
      },

      selectElement: (
        id: string | null,
        containerInfo?: { sectionId: string; rowId: string; columnId: string }
      ) => {
        set({
          selectedElementId: id,
          selectedSectionId: null,
          selectedRowId: null,
          selectedColumnId: null,
          isSettingsPanelOpen: id !== null,
          isLayersOpen: false,
          isSettingsOpen: false,
        });
      },

      getSelectedElement: () => {
        const { page, selectedElementId } = get();
        if (!selectedElementId) return null;
        const registry = new BuilderRegistry(page.sections || []);
        const elementInfo = registry.getElement(selectedElementId);
        if (elementInfo) {
          return elementInfo.element;
        }
        return (
          (page.elements || []).find((el) => el.id === selectedElementId) ||
          null
        );
      },

      // --- SECTION ACTIONS ---
      addSection: (section: Section) => {
        const { page, history, future } = get();

        // Create a new state with the section added
        const newPage = produce(page, (draft) => {
          draft.sections = [...draft.sections, section];
        });

        // Create a history entry
        const historyEntry = createHistoryEntryFromChange(
          page,
          newPage,
          "Add section"
        );

        set({
          page: newPage,
          history: historyEntry ? [...history, historyEntry] : history,
          future: [], // Clear future when a new action is performed
          canUndo: history.length > 0 || !!historyEntry,
          canRedo: false,
          selectedSectionId: section.id,
          selectedRowId: null,
          selectedColumnId: null,
          selectedElementId: null,
          isSettingsPanelOpen: true,
        });
      },

      updateSection: (id: string, updatedSection: Section) => {
        const { page, history, future } = get();

        // Create a new state with the section updated
        const newPage = produce(page, (draft) => {
          draft.sections = draft.sections.map((section) =>
            section.id === id ? updatedSection : section
          );
        });

        // Create a history entry
        const historyEntry = createHistoryEntryFromChange(
          page,
          newPage,
          "Update section"
        );

        set({
          page: newPage,
          history: historyEntry ? [...history, historyEntry] : history,
          future: [], // Clear future when a new action is performed
          canUndo: history.length > 0 || !!historyEntry,
          canRedo: false,
        });
      },

      updateSectionSnapshots: (
        id: string,
        snapshots: { card: string; preview: string }
      ) => {
        const { page } = get();
        const sections = Array.isArray(page.sections) ? page.sections : [];
        const updatedSections = sections.map((section) =>
          section.id === id ? { ...section, snapshots } : section
        );
        set({ page: { ...page, sections: updatedSections } });
      },

      deleteSection: (id: string) => {
        const { page, history, future } = get();

        // Create a new state with the section deleted
        const newPage = produce(page, (draft) => {
          draft.sections = draft.sections.filter(
            (section) => section.id !== id
          );
        });

        // Create a history entry
        const historyEntry = createHistoryEntryFromChange(
          page,
          newPage,
          "Delete section"
        );

        set({
          page: newPage,
          history: historyEntry ? [...history, historyEntry] : history,
          future: [], // Clear future when a new action is performed
          canUndo: history.length > 0 || !!historyEntry,
          canRedo: false,
          selectedSectionId: null,
          selectedRowId: null,
          selectedColumnId: null,
          selectedElementId: null,
        });
      },

      selectSection: (id: string | null) => {
        set({
          selectedElementId: null,
          selectedSectionId: id,
          selectedRowId: null,
          selectedColumnId: null,
          isSettingsPanelOpen: id !== null,
          isLayersOpen: false,
          isSettingsOpen: false,
        });
      },

      getSelectedSection: () => {
        const { page, selectedSectionId } = get();
        if (!selectedSectionId) return null;
        const sections = Array.isArray(page.sections) ? page.sections : [];
        return (
          sections.find((section) => section.id === selectedSectionId) ||
          null
        );
      },

      // --- ROW ACTIONS ---
      addRow: (sectionId: string, row: Row, parentColumnId?: string) => {
        const { page, history, historyIndex } = get();
        const newHistory = createHistorySnapshot(page, history, "Add Row");
        let updatedSections;
        if (parentColumnId) {
          updatedSections = addRowToColumn(
            page.sections,
            sectionId,
            parentColumnId,
            row
          );
        } else {
          updatedSections = page.sections.map((section) => {
            if (section.id !== sectionId) return section;
            return { ...section, rows: [...section.rows, row] };
          });
        }
        set({
          page: { ...page, sections: updatedSections },
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canUndo: true,
          canRedo: false,
          selectedSectionId: null,
          selectedRowId: row.id,
          selectedColumnId: null,
          selectedElementId: null,
          isSettingsPanelOpen: true,
        });
      },

      updateRow: (
        sectionId: string,
        rowId: string,
        updatedRow: Row,
        parentColumnId?: string
      ) => {
        const { page, history, historyIndex } = get();
        const newHistory = createHistorySnapshot(page, history, "Update Row");
        let updatedSections;
        if (parentColumnId) {
          updatedSections = updateRowRecursive(
            page.sections,
            rowId,
            updatedRow
          );
        } else {
          updatedSections = page.sections.map((section) => {
            if (section.id !== sectionId) return section;
            return {
              ...section,
              rows: section.rows.map((r) => (r.id === rowId ? updatedRow : r)),
            };
          });
        }
        set({
          page: { ...page, sections: updatedSections },
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canUndo: true,
          canRedo: false,
        });
      },

      deleteRow: (
        sectionId: string,
        rowId: string,
        parentColumnId?: string
      ) => {
        const { page, history, historyIndex } = get();
        const newHistory = createHistorySnapshot(page, history, "Delete Row");
        let updatedSections;
        if (parentColumnId) {
          updatedSections = deleteRowRecursive(page.sections, rowId);
        } else {
          updatedSections = page.sections.map((section) => {
            if (section.id !== sectionId) return section;
            return {
              ...section,
              rows: section.rows.filter((row) => row.id !== rowId),
            };
          });
        }
        set({
          page: { ...page, sections: updatedSections },
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canUndo: true,
          canRedo: false,
          selectedRowId: null,
          selectedColumnId: null,
          selectedElementId: null,
        });
      },

      selectRow: (
        sectionId: string,
        rowId: string | null,
        parentColumnId?: string
      ) => {
        set({
          selectedElementId: null,
          selectedSectionId: null,
          selectedRowId: rowId,
          selectedColumnId: null,
          isSettingsPanelOpen: rowId !== null,
          isLayersOpen: false,
          isSettingsOpen: false,
        });
      },

      getSelectedRow: () => {
        const { page, selectedRowId } = get();
        if (!selectedRowId) return null;
        const sections = Array.isArray(page.sections) ? page.sections : [];
        const registry = new BuilderRegistry(sections);
        const rowInfo = registry.getRow(selectedRowId);
        if (rowInfo) {
          return { section: rowInfo.section, row: rowInfo.row };
        }
        return null;
      },

      // --- COLUMN ACTIONS ---
      addColumn: (
        sectionId: string,
        rowId: string,
        column: Column,
        parentColumnId?: string
      ) => {
        const { page, history, historyIndex } = get();
        const newHistory = createHistorySnapshot(page, history, "Add Column");
        const updatedSections = produce(page.sections, (draft) => {
          const section = draft.find((s) => s.id === sectionId);
          if (section) {
            section.rows = addColumnToRowFn(
              section.rows,
              rowId,
              column,
              parentColumnId
            );
          }
        });
        set({
          page: { ...page, sections: updatedSections },
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canUndo: true,
          canRedo: false,
          selectedColumnId: column.id,
          selectedElementId: null,
          selectedSectionId: null,
          selectedRowId: parentColumnId || rowId,
          isSettingsPanelOpen: true,
        });
      },

      updateColumn: (
        sectionId: string,
        rowId: string,
        columnId: string,
        updatedColumn: Column,
        parentRowId?: string
      ) => {
        const { page, history, historyIndex } = get();
        const newHistory = createHistorySnapshot(
          page,
          history,
          "Update Column"
        );
        const updatedSections = produce(page.sections, (draft) => {
          const section = draft.find((s) => s.id === sectionId);
          if (section) {
            section.rows = updateColumnInRows(
              section.rows,
              rowId,
              columnId,
              updatedColumn,
              parentRowId || null
            );
          }
        });
        set({
          page: { ...page, sections: updatedSections },
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canUndo: true,
          canRedo: false,
        });
      },

      deleteColumn: (
        sectionId: string,
        rowId: string,
        columnId: string,
        parentColumnId?: string
      ) => {
        const { page, history, historyIndex } = get();
        const newHistory = createHistorySnapshot(
          page,
          history,
          "Delete Column"
        );
        const updatedSections = produce(page.sections, (draft) => {
          const section = draft.find((s) => s.id === sectionId);
          if (section) {
            section.rows = deleteColumnFromRows(
              section.rows,
              rowId,
              columnId,
              parentColumnId || null
            );
          }
        });
        set({
          page: { ...page, sections: updatedSections },
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canUndo: true,
          canRedo: false,
          selectedColumnId: null,
          selectedElementId: null,
        });
      },

      selectColumn: (
        sectionId: string,
        rowId: string,
        columnId: string | null,
        parentRowId?: string
      ) => {
        set({
          selectedElementId: null,
          selectedSectionId: null,
          selectedRowId: null,
          selectedColumnId: columnId,
          isSettingsPanelOpen: columnId !== null,
          isLayersOpen: false,
          isSettingsOpen: false,
        });
      },

      getSelectedColumn: () => {
        const { page, selectedColumnId } = get();
        if (!selectedColumnId) return null;
        const sections = Array.isArray(page.sections) ? page.sections : [];
        return findColumnById(sections, selectedColumnId);
      },

      // --- UI ACTIONS ---
      toggleSettingsPanel: () => {
        set((state) => ({ isSettingsPanelOpen: !state.isSettingsPanelOpen }));
      },

      openSettingsPanel: () => {
        set({ isSettingsPanelOpen: true });
      },

      closeSettingsPanel: () => {
        set({ isSettingsPanelOpen: false });
      },

      toggleAddSectionModal: () => {
        set((state) => ({
          isAddSectionModalOpen: !state.isAddSectionModalOpen,
        }));
      },

      setViewMode: (viewMode: "desktop" | "tablet" | "mobile") => {
        set({ viewMode });
      },

      togglePreviewMode: () => {
        set((state) => ({ isPreviewMode: !state.isPreviewMode }));
      },

      toggleLayers: () => {
        set((state) => ({ isLayersOpen: !state.isLayersOpen }));
      },

      toggleSettings: () => {
        set((state) => ({ isSettingsOpen: !state.isSettingsOpen }));
      },

      undoAction: () => {
        const { page, history, future } = get();

        if (history.length === 0) {
          console.warn("Undo action not available: no history available.");
          return;
        }

        // Get the last history entry
        const lastEntry = history[history.length - 1];

        // Apply the inverse patches to go back to the previous state
        const previousState = applyPatch(page, lastEntry.inversePatches);

        // Update the state
        set({
          page: previousState,
          history: history.slice(0, -1),
          future: [lastEntry, ...future],
          canUndo: history.length > 1,
          canRedo: true,
          selectedElementId: null,
          selectedSectionId: null,
          selectedRowId: null,
          selectedColumnId: null,
        });
      },

      redoAction: () => {
        const { page, history, future } = get();

        if (future.length === 0) {
          console.warn("Redo action not available: no future actions.");
          return;
        }

        // Get the first future entry
        const nextEntry = future[0];

        // Apply the patches to go forward to the next state
        const nextState = applyPatch(page, nextEntry.patches);

        // Update the state
        set({
          page: nextState,
          history: [...history, nextEntry],
          future: future.slice(1),
          canUndo: true,
          canRedo: future.length > 1,
          selectedElementId: null,
          selectedSectionId: null,
          selectedRowId: null,
          selectedColumnId: null,
        });
      },

      moveSection: (sectionId: string, newIndex: number) => {
        const { page, history, historyIndex } = get();
        const newHistory = createHistorySnapshot(page, history, "Move Section");
        const updatedSections = produce(page.sections, (draft) => {
          const sectionIndex = draft.findIndex(
            (section) => section.id === sectionId
          );
          if (sectionIndex === -1) return;
          const [movedSection] = draft.splice(sectionIndex, 1);
          draft.splice(newIndex, 0, movedSection);
        });
        set({
          page: { ...page, sections: updatedSections },
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canUndo: true,
          canRedo: false,
        });
      },

      moveRow: (
        rowId: string,
        sourceSectionId: string,
        sourceParentColumnId: string | undefined,
        targetSectionId: string,
        targetParentColumnId: string | undefined,
        targetIndex: number
      ) => {
        const { page, history, historyIndex } = get();
        const newHistory = createHistorySnapshot(page, history, "Move Row");
        const updatedSections = produce(page.sections, (draft) => {
          const sourceSection = draft.find((s) => s.id === sourceSectionId);
          if (!sourceSection) return;
          const targetSection = draft.find((s) => s.id === targetSectionId);
          if (!targetSection) return;
          let rowToMove: any = null;
          if (!sourceParentColumnId) {
            const rowIndex = sourceSection.rows.findIndex(
              (row) => row.id === rowId
            );
            if (rowIndex === -1) return;
            [rowToMove] = sourceSection.rows.splice(rowIndex, 1);
          } else {
            let foundParentColumn = false;
            for (let i = 0; i < sourceSection.rows.length; i++) {
              const row = sourceSection.rows[i];
              for (let j = 0; j < row.columns.length; j++) {
                const col = row.columns[j];
                if (col.id === sourceParentColumnId) {
                  if (!col.rows) col.rows = [];
                  const nestedRowIndex = col.rows.findIndex(
                    (nestedRow) => nestedRow.id === rowId
                  );
                  if (nestedRowIndex === -1) continue;
                  [rowToMove] = col.rows.splice(nestedRowIndex, 1);
                  foundParentColumn = true;
                  break;
                }
              }
              if (foundParentColumn) break;
            }
            if (!rowToMove) return;
          }
          if (!sourceParentColumnId && targetParentColumnId) {
            rowToMove.nestingLevel = 2;
            rowToMove.columns.forEach((col: any) => (col.nestingLevel = 2));
          } else if (sourceParentColumnId && !targetParentColumnId) {
            rowToMove.nestingLevel = 1;
            rowToMove.columns.forEach((col: any) => (col.nestingLevel = 1));
          }
          if (!targetParentColumnId) {
            targetSection.rows.splice(targetIndex, 0, rowToMove);
          } else {
            let foundTargetColumn = false;
            for (let i = 0; i < targetSection.rows.length; i++) {
              const row = targetSection.rows[i];
              for (let j = 0; j < row.columns.length; j++) {
                const col = row.columns[j];
                if (col.id === targetParentColumnId) {
                  if (!col.rows) col.rows = [];
                  col.rows.splice(targetIndex, 0, rowToMove);
                  foundTargetColumn = true;
                  break;
                }
              }
              if (foundTargetColumn) break;
            }
            if (!foundTargetColumn) return;
          }
        });
        set({
          page: { ...page, sections: updatedSections },
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canUndo: true,
          canRedo: false,
        });
      },

      moveColumn: (
        columnId: string,
        sourceSectionId: string,
        sourceRowId: string,
        sourceParentColumnId: string | undefined,
        targetSectionId: string,
        targetRowId: string,
        targetParentColumnId: string | undefined,
        targetIndex: number
      ) => {
        const { page, history, historyIndex } = get();
        const newHistory = createHistorySnapshot(page, history, "Move Column");
        const updatedSections = produce(page.sections, (draft) => {
          const sourceSection = draft.find((s) => s.id === sourceSectionId);
          if (!sourceSection) return;
          const targetSection = draft.find((s) => s.id === targetSectionId);
          if (!targetSection) return;
          let columnToMove: any = null;
          let sourceRow: any = null;
          if (!sourceParentColumnId) {
            sourceRow = sourceSection.rows.find(
              (row) => row.id === sourceRowId
            );
            if (!sourceRow) return;
            const columnIndex = sourceRow.columns.findIndex(
              (col) => col.id === columnId
            );
            if (columnIndex === -1) return;
            [columnToMove] = sourceRow.columns.splice(columnIndex, 1);
            if (sourceRow.columns.length > 0) {
              const newWidth = 100 / sourceRow.columns.length;
              sourceRow.columns.forEach((col: any) => (col.width = newWidth));
            }
          } else {
            let foundParentColumn = false;
            let parentColumn: any = null;
            for (let i = 0; i < sourceSection.rows.length; i++) {
              const row = sourceSection.rows[i];
              for (let j = 0; j < row.columns.length; j++) {
                const col = row.columns[j];
                if (col.id === sourceParentColumnId) {
                  parentColumn = col;
                  if (!parentColumn.rows) parentColumn.rows = [];
                  sourceRow = parentColumn.rows.find(
                    (nestedRow: any) => nestedRow.id === sourceRowId
                  );
                  if (!sourceRow) break;
                  const columnIndex = sourceRow.columns.findIndex(
                    (c: any) => c.id === columnId
                  );
                  if (columnIndex === -1) break;
                  [columnToMove] = sourceRow.columns.splice(columnIndex, 1);
                  if (sourceRow.columns.length > 0) {
                    const newWidth = 100 / sourceRow.columns.length;
                    sourceRow.columns.forEach((c: any) => (c.width = newWidth));
                  }
                  foundParentColumn = true;
                  break;
                }
              }
              if (foundParentColumn) break;
            }
            if (!columnToMove) return;
          }
          if (!sourceParentColumnId && targetParentColumnId) {
            columnToMove.nestingLevel = 2;
          } else if (sourceParentColumnId && !targetParentColumnId) {
            columnToMove.nestingLevel = 1;
          }
          let targetRow: any = null;
          if (!targetParentColumnId) {
            targetRow = targetSection.rows.find(
              (row) => row.id === targetRowId
            );
            if (!targetRow) return;
            targetRow.columns.splice(targetIndex, 0, columnToMove);
            const newWidth = 100 / targetRow.columns.length;
            targetRow.columns.forEach((col: any) => (col.width = newWidth));
          } else {
            let foundTargetColumn = false;
            let targetParentCol: any = null;
            for (let i = 0; i < targetSection.rows.length; i++) {
              const row = targetSection.rows[i];
              for (let j = 0; j < row.columns.length; j++) {
                const col = row.columns[j];
                if (col.id === targetParentColumnId) {
                  targetParentCol = col;
                  if (!targetParentCol.rows) targetParentCol.rows = [];
                  targetRow = targetParentCol.rows.find(
                    (nestedRow: any) => nestedRow.id === targetRowId
                  );
                  if (!targetRow) break;
                  targetRow.columns.splice(targetIndex, 0, columnToMove);
                  const newWidth = 100 / targetRow.columns.length;
                  targetRow.columns.forEach((c: any) => (c.width = newWidth));
                  foundTargetColumn = true;
                  break;
                }
              }
              if (foundTargetColumn) break;
            }
            if (!foundTargetColumn) return;
          }
        });
        set({
          page: { ...page, sections: updatedSections },
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canUndo: true,
          canRedo: false,
        });
      },

      moveElement: (
        elementId: string,
        sourceSectionId: string,
        sourceRowId: string,
        sourceColumnId: string,
        targetSectionId: string,
        targetRowId: string,
        targetColumnId: string,
        targetIndex: number
      ) => {
        const { page, history, historyIndex } = get();
        const newHistory = createHistorySnapshot(page, history, "Move Element");
        const updatedSections = produce(page.sections, (draft) => {
          const findColumnInSection = (
            rows: Row[],
            targetRowId: string,
            targetColumnId: string
          ) => {
            for (const row of rows) {
              if (row.id === targetRowId) {
                const column = row.columns.find((c) => c.id === targetColumnId);
                if (column)
                  return { column, row, parentColumn: null, isNested: false };
              }
              for (const column of row.columns) {
                if (column.rows) {
                  for (const nestedRow of column.rows) {
                    if (nestedRow.id === targetRowId) {
                      const nestedColumn = nestedRow.columns.find(
                        (c) => c.id === targetColumnId
                      );
                      if (nestedColumn)
                        return {
                          column: nestedColumn,
                          row: nestedRow,
                          parentColumn: column,
                          isNested: true,
                        };
                    }
                  }
                }
              }
            }
            return {
              column: null,
              row: null,
              parentColumn: null,
              isNested: false,
            };
          };
          const sourceSectionDraft = draft.find(
            (s) => s.id === sourceSectionId
          );
          if (!sourceSectionDraft) return;
          const targetSectionDraft = draft.find(
            (s) => s.id === targetSectionId
          );
          if (!targetSectionDraft) return;
          const sourceLookup = findColumnInSection(
            sourceSectionDraft.rows,
            sourceRowId,
            sourceColumnId
          );
          if (!sourceLookup.column) return;
          const sourceColumn = sourceLookup.column;
          const sourceElementIndex = sourceColumn.elements.findIndex(
            (e) => e.id === elementId
          );
          if (sourceElementIndex === -1) return;
          const [elementToMove] = sourceColumn.elements.splice(
            sourceElementIndex,
            1
          );
          const targetLookup = findColumnInSection(
            targetSectionDraft.rows,
            targetRowId,
            targetColumnId
          );
          if (!targetLookup.column) return;
          const targetColumn = targetLookup.column;
          let adjustedTargetIndex = targetIndex;
          if (
            sourceColumn === targetColumn &&
            sourceElementIndex < targetIndex
          ) {
            adjustedTargetIndex = Math.max(0, targetIndex - 1);
          }
          targetColumn.elements.splice(adjustedTargetIndex, 0, elementToMove);
        });
        set({
          page: { ...page, sections: updatedSections },
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canUndo: true,
          canRedo: false,
        });
      },

      reorderElement: (
        elementId: string,
        sectionId: string,
        rowId: string,
        columnId: string,
        direction: "up" | "down"
      ) => {
        const { page, history, future } = get();

        // Create a new state with the element reordered
        const newPage = produce(page, (draft) => {
          const findColumnInSection = (
            section: Section,
            targetRowId: string,
            targetColumnId: string
          ) => {
            for (const row of section.rows) {
              if (row.id === targetRowId) {
                const column = row.columns.find((c) => c.id === targetColumnId);
                if (column)
                  return { column, row, parentColumn: null, isNested: false };
              }
              for (const column of row.columns) {
                if (column.rows) {
                  for (const nestedRow of column.rows) {
                    if (nestedRow.id === targetRowId) {
                      const nestedColumn = nestedRow.columns.find(
                        (c) => c.id === targetColumnId
                      );
                      if (nestedColumn)
                        return {
                          column: nestedColumn,
                          row: nestedRow,
                          parentColumn: column,
                          isNested: true,
                        };
                    }
                  }
                }
              }
            }
            return {
              column: null,
              row: null,
              parentColumn: null,
              isNested: false,
            };
          };

          const sectionDraft = draft.sections.find((s) => s.id === sectionId);
          if (!sectionDraft) return;

          const { column } = findColumnInSection(sectionDraft, rowId, columnId);
          if (!column) return;

          const elementIndex = column.elements.findIndex(
            (e) => e.id === elementId
          );
          if (elementIndex === -1) return;

          const newIndex =
            direction === "up"
              ? Math.max(0, elementIndex - 1)
              : Math.min(column.elements.length - 1, elementIndex + 1);
          if (newIndex === elementIndex) return;

          const [element] = column.elements.splice(elementIndex, 1);
          column.elements.splice(newIndex, 0, element);
        });

        // Create a history entry
        const historyEntry = createHistoryEntryFromChange(
          page,
          newPage,
          "Reorder Element"
        );

        set({
          page: newPage,
          history: historyEntry ? [...history, historyEntry] : history,
          future: [], // Clear future when a new action is performed
          canUndo: history.length > 0 || !!historyEntry,
          canRedo: false,
        });
      },

      reorderColumn: (
        columnId: string,
        sectionId: string,
        rowId: string,
        parentRowId: string | undefined,
        direction: "up" | "down"
      ) => {
        const { page, history, historyIndex } = get();
        const newHistory = createHistorySnapshot(
          page,
          history,
          "Reorder Column"
        );
        const updatedSections = produce(page.sections, (draft) => {
          const section = draft.find((s) => s.id === sectionId);
          if (!section) return;
          let targetRow, parentColumn;
          if (parentRowId) {
            for (const topRow of section.rows) {
              for (const col of topRow.columns) {
                if (col.rows) {
                  const nestedRow = col.rows.find((r) => r.id === rowId);
                  if (nestedRow) {
                    targetRow = nestedRow;
                    parentColumn = col;
                    break;
                  }
                }
              }
              if (targetRow) break;
            }
          } else {
            targetRow = section.rows.find((r) => r.id === rowId);
          }
          if (!targetRow) return;
          const columnIndex = targetRow.columns.findIndex(
            (c) => c.id === columnId
          );
          if (columnIndex === -1) return;
          const newIndex =
            direction === "up"
              ? Math.max(0, columnIndex - 1)
              : Math.min(targetRow.columns.length - 1, columnIndex + 1);
          if (newIndex === columnIndex) return;
          const [column] = targetRow.columns.splice(columnIndex, 1);
          targetRow.columns.splice(newIndex, 0, column);
          const newWidth = 100 / targetRow.columns.length;
          targetRow.columns.forEach(
            (col) => (col.width = Number.parseFloat(newWidth.toFixed(2)))
          );
        });
        set({
          page: { ...page, sections: updatedSections },
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canUndo: true,
          canRedo: false,
        });
      },

      reorderRow: (
        rowId: string,
        sectionId: string,
        parentColumnId: string | undefined,
        direction: "up" | "down"
      ) => {
        const { page, history, historyIndex } = get();
        const newHistory = createHistorySnapshot(page, history, "Reorder Row");
        const updatedSections = produce(page.sections, (draft) => {
          const section = draft.find((s) => s.id === sectionId);
          if (!section) return;
          if (!parentColumnId) {
            const rowIndex = section.rows.findIndex((r) => r.id === rowId);
            if (rowIndex === -1) return;
            const newIndex =
              direction === "up"
                ? Math.max(0, rowIndex - 1)
                : Math.min(section.rows.length - 1, rowIndex + 1);
            if (newIndex === rowIndex) return;
            const [row] = section.rows.splice(rowIndex, 1);
            section.rows.splice(newIndex, 0, row);
          } else {
            let parentColumn: any = null;
            for (const r of section.rows) {
              for (const c of r.columns) {
                if (c.id === parentColumnId) {
                  parentColumn = c;
                  break;
                }
              }
              if (parentColumn) break;
            }
            if (!parentColumn || !parentColumn.rows) return;
            const rowIndex = parentColumn.rows.findIndex((r) => r.id === rowId);
            if (rowIndex === -1) return;
            const newIndex =
              direction === "up"
                ? Math.max(0, rowIndex - 1)
                : Math.min(parentColumn.rows.length - 1, rowIndex + 1);
            if (newIndex === rowIndex) return;
            const [row] = parentColumn.rows.splice(rowIndex, 1);
            parentColumn.rows.splice(newIndex, 0, row);
          }
        });
        set({
          page: { ...page, sections: updatedSections },
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canUndo: true,
          canRedo: false,
        });
      },

      setCurrentPageInfo: (pageInfo: { id: string; title: string }) => {
        set({
          currentPageId: pageInfo.id,
          currentPageTitle: pageInfo.title,
        });
      },

      savePage: async () => null,

      setPageSnapshots: (
        pageId: string,
        snapshots: { card: string; preview: string }
      ) => {
        set((state) => ({
          pageSnapshots: {
            ...state.pageSnapshots,
            [pageId]: snapshots,
          },
        }));
      },
    }),
    { name: "builderStore" }
  )
);

// Helper function to find the duplicated element ID
function findDuplicatedElementId(oldPage: Page, newPage: Page): string | null {
  // Find elements that exist in the new page but not in the old page
  const oldElements = getAllElementIds(oldPage);
  const newElements = getAllElementIds(newPage);

  const newElementIds = newElements.filter((id) => !oldElements.includes(id));

  return newElementIds.length > 0 ? newElementIds[0] : null;
}

// Helper function to get all element IDs from a page
function getAllElementIds(page: Page): string[] {
  const ids: string[] = [];

  // Add page-level elements
  if (page.elements) {
    ids.push(...page.elements.map((el) => el.id));
  }

  // Add elements from sections - ensure sections is an array
  const sections = Array.isArray(page.sections) ? page.sections : [];
  sections.forEach((section) => {
    section.rows.forEach((row) => {
      row.columns.forEach((column) => {
        // Add elements from this column
        ids.push(...column.elements.map((el) => el.id));

        // Add elements from nested rows
        if (column.rows) {
          column.rows.forEach((nestedRow) => {
            nestedRow.columns.forEach((nestedColumn) => {
              ids.push(...nestedColumn.elements.map((el) => el.id));
            });
          });
        }
      });
    });
  });

  return ids;
}

/* =====================================================
   HELPER FUNCTIONS
===================================================== */

/**
 * In case you still need to clone sections outside of a state update, this returns a deep clone.
 * (Alternatively, remove this helper if you exclusively use produce.)
 */
function cloneSections(sections: Section[]): Section[] {
  return JSON.parse(JSON.stringify(sections));
}

/**
 * Creates a selective clone of the page for history persisting.
 */
function selectiveClonePage(page: Page): Partial<Page> {
  return {
    id: page.id,
    title: page.title,
    sections: Array.isArray(page.sections) ? cloneSections(page.sections) : [],
    elements: Array.isArray(page.elements) ? page.elements.map((el) => ({ ...el })) : [],
  };
}

function createHistorySnapshot(
  page: Page,
  history: HistoryEntry[],
  action = "Update"
): HistoryEntry[] {
  // Create a deep clone of the page to avoid modifying the original
  const clonedPage = JSON.parse(JSON.stringify(page));

  // Create an empty history entry
  const emptyPage = {
    id: page.id,
    title: page.title,
    sections: [],
    elements: [],
  };

  // Create patches
  const patches = createPatch(emptyPage, clonedPage);
  const inversePatches = createPatch(clonedPage, emptyPage);

  const newEntry: HistoryEntry = {
    action,
    patches,
    inversePatches,
  };

  return [...history, newEntry];
}

/**
 * Creates a deep clone of the page.
 */
function deepClonePage<T extends Partial<Page>>(obj: T): T {
  return produce(obj, (draft) => {});
}

/**
 * Creates an empty row.
 */
export function createEmptyRow(nestingLevel = 1): Row {
  return {
    id: generateId("row"),
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
}

/**
 * Creates an empty column.
 */
function createEmptyColumn(nestingLevel = 1): Column {
  return {
    id: generateId("column"),
    width: 100,
    elements: [],
    settings: {
      paddingTop: 15,
      paddingRight: 15,
      paddingBottom: 15,
      paddingLeft: 15,
      marginTop: 0,
      marginRight: 0,
      marginBottom: 0,
      marginLeft: 0,
    },
    nestingLevel,
  };
}

/**
 * Merges default element settings.
 */
function createElementWithDefaultSettings(element: Element): Element {
  return {
    ...element,
    settings: {
      width: "100%",
      height: "auto",
      paddingTop: 16,
      paddingRight: 16,
      paddingBottom: 16,
      paddingLeft: 16,
      marginTop: 0,
      marginRight: 0,
      marginBottom: 16,
      marginLeft: 0,
      ...element.settings,
    },
  };
}

/**
 * Recalculates widths for columns.
 */
function recalcWidths(columns: Column[]): Column[] {
  if (columns.length === 0) return columns;
  if (columns.length === 1) return [{ ...columns[0], width: 100 }];
  const newWidth = Number.parseFloat((100 / columns.length).toFixed(2));
  return columns.map((col) => ({ ...col, width: newWidth }));
}

/**
 * Generates a unique ID.
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
}

/**
 * Updates an element within a column.
 */
function updateElementInColumn(
  column: any,
  elementId: string,
  updateElement: () => Element
): any {
  return {
    ...column,
    elements: column.elements.map((el: any) =>
      el.id === elementId ? updateElement() : el
    ),
  };
}

/**
 * Recursively updates an element by ID.
 */
function updateElementRecursive(
  sections: Section[],
  elementId: string,
  updatedElement: Element
): Section[] {
  const registry = new BuilderRegistry(sections);
  const elementInfo = registry.getElement(elementId);
  if (!elementInfo) return sections;
  const { column, row, section } = elementInfo;
  return updateSectionInArray(sections, section.id, (s) =>
    updateRowInSection(s, row.id, (r) =>
      updateColumnInRow(r, column.id, (c) =>
        updateElementInColumn(c, elementId, () => updatedElement)
      )
    )
  );
}

/**
 * Recursively deletes an element.
 */
function deleteElementRecursive(
  sections: Section[],
  elementId: string
): Section[] {
  const registry = new BuilderRegistry(sections);
  const elementInfo = registry.getElement(elementId);
  if (!elementInfo) return sections;
  const { column, row, section } = elementInfo;
  return updateSectionInArray(sections, section.id, (s) =>
    updateRowInSection(s, row.id, (r) =>
      updateColumnInRow(r, column.id, (c) =>
        removeElementFromColumn(c, elementId)
      )
    )
  );
}

/**
 * Recursively duplicates an element.
 */
function duplicateElementRecursive(
  sections: Section[],
  elementId: string
): { sections: Section[]; duplicatedElement?: Element } {
  const registry = new BuilderRegistry(sections);
  const elementInfo = registry.getElement(elementId);
  if (!elementInfo) return { sections };
  const { element, column, row, section } = elementInfo;
  const duplicatedElement = { ...element, id: generateId("element") };
  const elementIndex = column.elements.findIndex((el) => el.id === elementId);
  const updatedSections = updateSectionInArray(sections, section.id, (s) =>
    updateRowInSection(s, row.id, (r) =>
      updateColumnInRow(r, column.id, (c) => {
        const updatedElements = [...c.elements];
        updatedElements.splice(elementIndex + 1, 0, duplicatedElement);
        return { ...c, elements: updatedElements };
      })
    )
  );
  return { sections: updatedSections, duplicatedElement };
}

/**
 * Recursively updates a row.
 */
function updateRowRecursive(
  sections: Section[],
  rowId: string,
  updatedRow: Row
): Section[] {
  const registry = new BuilderRegistry(sections);
  const rowInfo = registry.getRow(rowId);
  if (!rowInfo) return sections;
  const { row, section, parentColumnId } = rowInfo;
  if (parentColumnId) {
    return updateSectionInArray(sections, section.id, (s) => {
      const updateNestedRow = (columns: Column[]): Column[] =>
        columns.map((col) =>
          col.id === parentColumnId
            ? {
                ...col,
                rows:
                  col.rows?.map((r) => (r.id === rowId ? updatedRow : r)) || [],
              }
            : col
        );
      return {
        ...s,
        rows: s.rows.map((r) => ({
          ...r,
          columns: updateNestedRow(r.columns),
        })),
      };
    });
  }
  return updateSectionInArray(sections, section.id, (s) => ({
    ...s,
    rows: s.rows.map((r) => (r.id === rowId ? updatedRow : r)),
  }));
}

/**
 * Recursively deletes a row.
 */
function deleteRowRecursive(sections: Section[], rowId: string): Section[] {
  const registry = new BuilderRegistry(sections);
  const rowInfo = registry.getRow(rowId);
  if (!rowInfo) return sections;
  const { section, parentColumnId } = rowInfo;
  if (parentColumnId) {
    return updateSectionInArray(sections, section.id, (s) => {
      const removeNestedRow = (columns: Column[]): Column[] =>
        columns.map((col) =>
          col.id === parentColumnId
            ? { ...col, rows: col.rows?.filter((r) => r.id !== rowId) || [] }
            : col
        );
      return {
        ...s,
        rows: s.rows.map((r) => ({
          ...r,
          columns: removeNestedRow(r.columns),
        })),
      };
    });
  }
  return updateSectionInArray(sections, section.id, (s) => ({
    ...s,
    rows: s.rows.filter((r) => r.id !== rowId),
  }));
}

/**
 * Adds a row to a column.
 */
function addRowToColumn(
  sections: Section[],
  sectionId: string,
  columnId: string,
  row: Row
): Section[] {
  const registry = new BuilderRegistry(sections);
  const columnInfo = registry.getColumn(columnId);
  if (!columnInfo) return sections;
  const { row: parentRow, section } = columnInfo;
  return updateSectionInArray(sections, section.id, (s) =>
    updateRowInSection(s, parentRow.id, (r) =>
      updateColumnInRow(r, columnId, (c) => ({
        ...c,
        rows: [...(c.rows || []), row],
      }))
    )
  );
}

/**
 * Updates a section by applying an updater function.
 */
const updateSectionInArray = (
  sections: any[],
  sectionId: string,
  updateSection: (section: any) => any
) => {
  return sections.map((section) =>
    section.id === sectionId ? updateSection(section) : section
  );
};

/**
 * Updates a row in a section.
 */
const updateRowInSection = (
  section: any,
  rowId: string,
  updateRow: (row: any) => any
) => {
  return {
    ...section,
    rows: section.rows.map((row: any) =>
      row.id === rowId ? updateRow(row) : row
    ),
  };
};

/**
 * Updates a column in a row.
 */
const updateColumnInRow = (
  row: any,
  columnId: string,
  updateColumn: (column: any) => any
) => {
  return {
    ...row,
    columns: row.columns.map((column: any) =>
      column.id === columnId ? updateColumn(column) : column
    ),
  };
};

/**
 * Recursively updates a column within an array of rows.
 */
function updateColumnInRows(
  rows: Row[],
  targetRowId: string,
  targetColumnId: string,
  updatedCol: Column,
  parentId: string | null = null
): Row[] {
  return rows.map((row) => {
    if (row.id === targetRowId) {
      return {
        ...row,
        columns: row.columns.map((col) =>
          col.id === targetColumnId ? updatedCol : col
        ),
      };
    }
    return {
      ...row,
      columns: row.columns.map((col) => {
        if (
          (parentId && col.id === parentId) ||
          (col.rows && col.rows.length > 0)
        ) {
          return {
            ...col,
            rows: col.rows
              ? updateColumnInRows(
                  col.rows,
                  targetRowId,
                  targetColumnId,
                  updatedCol,
                  col.id
                )
              : col.rows,
          };
        }
        return col;
      }),
    };
  });
}

/**
 * Helper to delete a column from an array of rows.
 */
function deleteColumnFromRows(
  rows: Row[],
  targetRowId: string,
  targetColumnId: string,
  parentId: string | null = null
): Row[] {
  return rows.map((row) => {
    if (row.id === targetRowId) {
      const filteredColumns = row.columns.filter(
        (col) => col.id !== targetColumnId
      );
      return { ...row, columns: recalcWidths(filteredColumns) };
    }
    return {
      ...row,
      columns: row.columns.map((col) => {
        if (col.rows && col.rows.length > 0) {
          return {
            ...col,
            rows: deleteColumnFromRows(
              col.rows,
              targetRowId,
              targetColumnId,
              col.id
            ),
          };
        }
        return col;
      }),
    };
  });
}

/**
 * Removes an element from a column.
 */
const removeElementFromColumn = (column: any, elementId: string) => {
  return {
    ...column,
    elements: column.elements.filter((el: any) => el.id !== elementId),
  };
};

/**
 * Finds a column by ID.
 */
function findColumnById(sections: Section[], columnId: string) {
  const registry = new BuilderRegistry(sections);
  return registry.getColumn(columnId);
}

/**
 * Finds a row by ID.
 */
function findRowById(sections: Section[], rowId: string) {
  const registry = new BuilderRegistry(sections);
  return registry.getRow(rowId);
}

/**
 * Finds an element by ID.
 */
function findElementById(sections: Section[], elementId: string) {
  const registry = new BuilderRegistry(sections);
  return registry.getElement(elementId);
}

/**
 * BuilderRegistry efficiently indexes elements, columns, and rows.
 */
export class BuilderRegistry {
  private elementMap: Map<
    string,
    {
      element: Element;
      column: Column;
      row: Row;
      section: Section;
      parentColumnId?: string;
    }
  > = new Map();
  private columnMap: Map<
    string,
    { column: Column; row: Row; section: Section; parentColumnId?: string }
  > = new Map();
  private rowMap: Map<
    string,
    { row: Row; section: Section; parentColumnId?: string }
  > = new Map();

  constructor(private sections: Section[]) {
    this.populateMaps(sections);
  }

  private populateMaps(sections: Section[]) {
    sections.forEach((section) => {
      section.rows.forEach((row) => {
        this.rowMap.set(row.id, { row, section });
        row.columns.forEach((column) => {
          this.columnMap.set(column.id, { column, row, section });
          column.elements.forEach((element) => {
            this.elementMap.set(element.id, { element, column, row, section });
          });
          if (column.rows) {
            column.rows.forEach((nestedRow) => {
              this.rowMap.set(nestedRow.id, {
                row: nestedRow,
                section,
                parentColumnId: column.id,
              });
              nestedRow.columns.forEach((nestedColumn) => {
                this.columnMap.set(nestedColumn.id, {
                  column: nestedColumn,
                  row: nestedRow,
                  section,
                  parentColumnId: column.id,
                });
                nestedColumn.elements.forEach((element) => {
                  this.elementMap.set(element.id, {
                    element,
                    column: nestedColumn,
                    row: nestedRow,
                    section,
                    parentColumnId: column.id,
                  });
                });
              });
            });
          }
        });
      });
    });
  }

  getElement(elementId: string):
    | {
        element: Element;
        column: Column;
        row: Row;
        section: Section;
        parentColumnId?: string;
      }
    | undefined {
    return this.elementMap.get(elementId);
  }

  getColumn(
    columnId: string
  ):
    | { column: Column; row: Row; section: Section; parentColumnId?: string }
    | undefined {
    return this.columnMap.get(columnId);
  }

  getRow(
    rowId: string
  ): { row: Row; section: Section; parentColumnId?: string } | undefined {
    return this.rowMap.get(rowId);
  }
}

/**
 * Deep clone using Immer.
 */
function deepClone<T>(obj: T): T {
  return produce(obj, (draft) => {});
}

/**
 * Adds a column to a row.
 */
function addColumnToRowFn(
  rows: Row[],
  rowId: string,
  column: Column,
  parentColumnId?: string
): Row[] {
  return rows.map((row) => {
    if (row.id === rowId) {
      const updatedColumns = [...row.columns, column];
      const newWidth = 100 / updatedColumns.length;
      updatedColumns.forEach((col) => (col.width = newWidth));
      return { ...row, columns: updatedColumns };
    }
    return row;
  });
}

// Helper function to add a row to a column
function addRowToColumnFn(
  sections: Section[],
  sectionId: string,
  columnId: string,
  row: Row
): Section[] {
  return produce(sections, (draft) => {
    const registry = new BuilderRegistry(draft);
    const columnInfo = registry.getColumn(columnId);
    if (!columnInfo) return;

    const { row: parentRow, section } = columnInfo;
    if (!section || !parentRow) return;

    const column = parentRow.columns.find((c) => c.id === columnId);
    if (!column) return;

    if (!column.rows) column.rows = [];
    column.rows.push(row);
  });
}

export { useBuilderStore };
