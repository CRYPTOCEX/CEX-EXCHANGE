"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Section } from "@/types/builder";

interface SavedSectionsState {
  savedSections: Section[];
  addSection: (section: Section) => void;
  removeSection: (sectionId: string) => void;
  getSavedSections: () => Section[];
  clearSavedSections: () => void;
}

export const useSavedSectionsStore = create<SavedSectionsState>()(
  persist(
    (set, get) => ({
      savedSections: [],

      addSection: (section: Section) => {
        // Create a copy with a new ID to avoid conflicts
        const sectionToSave = {
          ...section,
          id: `saved-${Date.now()}`,
          isSaved: true,
        };

        set((state) => ({
          savedSections: [...state.savedSections, sectionToSave],
        }));
      },

      removeSection: (sectionId: string) => {
        set((state) => ({
          savedSections: state.savedSections.filter(
            (section) => section.id !== sectionId
          ),
        }));
      },

      getSavedSections: () => {
        return get().savedSections;
      },

      clearSavedSections: () => {
        set({ savedSections: [] });
      },
    }),
    {
      name: "saved-sections-storage",
    }
  )
);
