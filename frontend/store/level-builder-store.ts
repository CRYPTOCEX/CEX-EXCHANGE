import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { platformFeatures } from "@/app/[locale]/(dashboard)/admin/crm/kyc/components/level-builder/feature-management";
import { COUNTRY_OPTIONS } from "@/utils/countries";

export const parseKycLevel = (level: any) => {
  // Parse features array or string
  let parsedFeatures: string[] = [];
  if (Array.isArray(level.features)) {
    parsedFeatures = level.features;
  } else if (typeof level.features === "string") {
    try {
      parsedFeatures = JSON.parse(level.features);
    } catch {
      parsedFeatures = [];
    }
  }

  // Map to [{id, enabled}]
  const normalizedFeatures = platformFeatures.map((feature) => ({
    id: feature.id,
    enabled: parsedFeatures.includes(feature.id),
  }));

  return {
    ...level,
    fields:
      typeof level.fields === "string"
        ? JSON.parse(level.fields)
        : level.fields || [],
    features: normalizedFeatures,
    verificationService:
      typeof level.verificationService === "string"
        ? JSON.parse(level.verificationService)
        : level.verificationService || null,
  };
};

export const makeUuid = () => {
  return crypto.randomUUID();
};

interface LevelBuilderState {
  // Levels
  levels: KycLevel[];
  currentLevel: KycLevel | null;
  isLoading: boolean;
  error: string | null;

  // Level actions
  fetchLevels: () => Promise<void>;
  fetchLevel: (id: string) => Promise<void>;
  createLevel: (name: string) => Promise<KycLevel | void>;
  updateLevel: (level: KycLevel) => Promise<void>;
  deleteLevel: (id: string) => Promise<void>;
  setCurrentLevel: (level: KycLevel | null) => void;

  // Bulk actions using bulk endpoints
  bulkActivateLevels: (ids: string[]) => Promise<void>;
  bulkDeactivateLevels: (ids: string[]) => Promise<void>;
  bulkDeleteLevels: (ids: string[]) => Promise<void>;

  // Field actions
  addField: (type: KycFieldType, position?: number) => void;
  updateField: (field: KycField) => void;
  removeField: (fieldId: string) => void;
  reorderField: (fieldId: string, newOrder: number) => void;
  duplicateField: (fieldId: string) => void;
}

export const useLevelBuilderStore = create<LevelBuilderState>((set, get) => ({
  levels: [],
  currentLevel: null,
  isLoading: false,
  error: null,

  // Level actions
  fetchLevels: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/admin/crm/kyc/level",
      silentSuccess: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    if (!data || !data.items) {
      set({ levels: [], isLoading: false });
      return;
    }
    const parsedLevels = data.items.map((level: any) => parseKycLevel(level));
    set({ levels: parsedLevels, isLoading: false });
  },

  fetchLevel: async (id: string) => {
    set({ isLoading: true, error: null });
    const existingLevel = get().levels.find((t) => t.id === id);
    if (existingLevel) {
      set({ currentLevel: existingLevel, isLoading: false });
      return;
    }
    const { data, error } = await $fetch({
      url: `/api/admin/crm/kyc/level/${id}`,
      silentSuccess: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    if (!data) {
      set({ error: "Level not found", isLoading: false });
      return;
    }
    const parsedData = parseKycLevel(data);
    set({ currentLevel: parsedData, isLoading: false });
    const levels = get().levels;
    const levelIndex = levels.findIndex((t) => t.id === id);
    if (levelIndex === -1) {
      set({ levels: [...levels, parsedData] });
    } else {
      const updatedLevels = [...levels];
      updatedLevels[levelIndex] = parsedData;
      set({ levels: updatedLevels });
    }
  },

  createLevel: async (name: string) => {
    set({ isLoading: true, error: null });
    if (!name || name.trim() === "") {
      name = "New Level";
    }
    const currentLevel = get().currentLevel;
    if (!currentLevel) {
      set({ error: "No current level to save", isLoading: false });
      return;
    }
    const newLevel: Partial<KycLevel> = {
      ...currentLevel,
      id: currentLevel.id || makeUuid(),
      name: name.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Remove empty or undefined serviceId
    if (!newLevel.serviceId || newLevel.serviceId.trim() === '') {
      delete newLevel.serviceId;
    }
    const { data, error } = await $fetch({
      url: "/api/admin/crm/kyc/level",
      method: "POST",
      body: newLevel,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    if (!data) {
      set({
        error: "Failed to create level - no data returned",
        isLoading: false,
      });
      return;
    }
    const parsedLevel = parseKycLevel(data);
    set((state) => ({
      levels: [...state.levels, parsedLevel],
      currentLevel: parsedLevel,
      isLoading: false,
    }));
    return parsedLevel;
  },

  updateLevel: async (level) => {
    set({ error: null });
    
    // Clean up the level data before sending
    const cleanLevel = { ...level };
    if (!cleanLevel.serviceId || cleanLevel.serviceId.trim() === '') {
      delete cleanLevel.serviceId;
    }
    
    const { data, error } = await $fetch({
      url: `/api/admin/crm/kyc/level/${level.id}`,
      method: "PUT",
      body: cleanLevel,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    if (!data) {
      set({
        error: "Failed to update level - no data returned",
        isLoading: false,
      });
      return;
    }
    set((state) => ({
      levels: state.levels.map((t) => (t.id === level.id ? level : t)),
    }));
  },

  deleteLevel: async (id: string) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: `/api/admin/crm/kyc/level/${id}`,
      method: "DELETE",
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    set((state) => ({
      levels: state.levels.filter((t) => t.id !== id),
      currentLevel: state.currentLevel?.id === id ? null : state.currentLevel,
      isLoading: false,
    }));
  },

  // Bulk actions using bulk endpoints and sending status in the body for activate/deactivate.
  bulkActivateLevels: async (ids: string[]) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/admin/crm/kyc/level/status",
      method: "PUT",
      body: { ids, status: "ACTIVE" },
      silentSuccess: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    set((state) => ({
      levels: state.levels.map((level) =>
        ids.includes(level.id)
          ? { ...level, status: "ACTIVE", updatedAt: new Date() }
          : level
      ),
      isLoading: false,
    }));
  },

  bulkDeactivateLevels: async (ids: string[]) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/admin/crm/kyc/level/status",
      method: "PUT",
      body: { ids, status: "INACTIVE" },
      silentSuccess: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    set((state) => ({
      levels: state.levels.map((level) =>
        ids.includes(level.id)
          ? { ...level, status: "INACTIVE", updatedAt: new Date() }
          : level
      ),
      isLoading: false,
    }));
  },

  bulkDeleteLevels: async (ids: string[]) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: "/api/admin/crm/kyc/level",
      method: "DELETE",
      body: { ids },
      silentSuccess: true,
    });
    if (error) {
      set({ error, isLoading: false });
      return;
    }
    set((state) => ({
      levels: state.levels.filter((level) => !ids.includes(level.id)),
      currentLevel:
        state.currentLevel && ids.includes(state.currentLevel.id)
          ? null
          : state.currentLevel,
      isLoading: false,
    }));
  },

  setCurrentLevel: (level) => {
    set({ currentLevel: level });
  },

  // Field actions remain unchanged
  addField: (type: KycFieldType, position?: number) => {
    const { currentLevel } = get();
    if (!currentLevel) return;
    const newField: Partial<KycField> = {
      id: makeUuid(),
      type,
      label: `New ${type.charAt(0) + type.slice(1).toLowerCase()} Field`,
      required: false,
      order: 0,
    };
    switch (type) {
      case "SELECT":
      case "RADIO":
      case "CHECKBOX":
        (newField as any).options = [
          { value: "option1", label: "Option 1" },
          { value: "option2", label: "Option 2" },
        ];
        if (type === "SELECT") {
          (newField as any).multiple = false;
        }
        break;
      case "SECTION":
      case "TEXT":
      case "EMAIL":
      case "PHONE":
        newField.placeholder = `Enter ${type.toLowerCase()}`;
        break;
      case "TEXTAREA":
        newField.placeholder = "Enter text here";
        newField.rows = 3;
        break;
      case "NUMBER":
        newField.placeholder = "Enter number";
        newField.min = 0;
        newField.step = 1;
        break;
      case "DATE":
        newField.format = "yyyy-MM-dd";
        break;
      case "FILE":
        newField.accept = "image/*,application/pdf";
        newField.maxSize = 5 * 1024 * 1024;
        newField.multiple = false;
        break;
      case "IDENTITY":
        (newField as any).documentTypes = [
          { value: "passport", label: "Passport" },
          { value: "drivers-license", label: "Driver's License" },
          { value: "national-id", label: "National ID Card" },
        ];
        (newField as any).defaultDocumentType = "passport";
        (newField as any).requireSelfie = true;
        (newField as any).verificationService = "sumsub-1";
        break;
    }
    const updatedLevel = { ...currentLevel };
    const fields = [...(updatedLevel.fields || [])];
    if (position !== undefined && position >= 0 && position <= fields.length) {
      fields.splice(position, 0, newField as KycField);
      fields.forEach((field, index) => {
        field.order = index;
      });
    } else {
      newField.order = fields.length;
      fields.push(newField as KycField);
    }
    updatedLevel.fields = fields;
    set({ currentLevel: updatedLevel });
  },

  updateField: (updatedField: KycField) => {
    const { currentLevel } = get();
    if (!currentLevel) return;
    const updatedLevel = { ...currentLevel };
    updatedLevel.fields = updatedLevel.fields.map((field) =>
      field.id === updatedField.id ? updatedField : field
    );
    set({ currentLevel: updatedLevel });
  },

  removeField: (fieldId: string) => {
    const { currentLevel } = get();
    if (!currentLevel) return;
    const updatedLevel = { ...currentLevel };
    updatedLevel.fields = updatedLevel.fields.filter(
      (field) => field.id !== fieldId
    );
    set({ currentLevel: updatedLevel });
  },

  reorderField: (fieldId: string, newOrder: number) => {
    const { currentLevel } = get();
    if (!currentLevel) return;
    const updatedLevel = { ...currentLevel };
    const fields = [...(updatedLevel.fields || [])];
    const fieldIndex = fields.findIndex((f) => f.id === fieldId);
    if (fieldIndex === -1) return;
    const [movedField] = fields.splice(fieldIndex, 1);
    fields.splice(newOrder, 0, movedField);
    const reorderedFields = fields.map((field, index) => ({
      ...field,
      order: index,
    }));
    updatedLevel.fields = reorderedFields;
    set({ currentLevel: updatedLevel });
  },

  duplicateField: (fieldId: string) => {
    const { currentLevel } = get();
    if (!currentLevel) return;
    const updatedLevel = { ...currentLevel };
    const fields = updatedLevel.fields || [];
    const fieldToDuplicate = fields.find((f) => f.id === fieldId);
    if (!fieldToDuplicate) return;
    const duplicatedField = JSON.parse(JSON.stringify(fieldToDuplicate));
    duplicatedField.id = makeUuid();
    duplicatedField.label = `${fieldToDuplicate.label} (Copy)`;
    duplicatedField.order = (fieldToDuplicate.order || 0) + 1;
    if (
      fieldToDuplicate.type === "SELECT" ||
      fieldToDuplicate.type === "RADIO" ||
      fieldToDuplicate.type === "CHECKBOX"
    ) {
      if (!duplicatedField.options) {
        duplicatedField.options = [
          { value: "option1", label: "Option 1" },
          { value: "option2", label: "Option 2" },
        ];
      }
    }
    const adjustedFields = fields.map((f) => ({
      ...f,
      order: (f.order || 0) > (fieldToDuplicate.order || 0) ? (f.order || 0) + 1 : (f.order || 0),
    }));
    updatedLevel.fields = [...adjustedFields, duplicatedField].sort(
      (a, b) => a.order - b.order
    );
    set({ currentLevel: updatedLevel });
  },
}));
