"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";

import { BuilderHeader } from "./builder-header";
import { VerticalIconBar } from "./vertical-icon-bar";
import { LeftSidebar, LEVEL_PRESETS } from "./left-sidebar";
import { BuilderContent } from "./builder-content";
import { RightSidebar } from "./right-sidebar";
import { BuilderFooter } from "./builder-footer";
import { Guide } from "./guide";
import { FormPreview } from "./form-preview";
import { FeatureManagement } from "./feature-management";
import { VerificationServicesView } from "./verification-services-view";
import { useLevelBuilderStore, makeUuid } from "@/store/level-builder-store";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface LevelBuilderProps {
  levelId?: string;
  isEdit?: boolean;
}
export default function LevelBuilderComponent({
  levelId,
  isEdit = false,
}: LevelBuilderProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement>(null);
  const fieldContainerRef = useRef<HTMLDivElement>(null);

  const {
    currentLevel,
    isLoading,
    error,
    fetchLevel,
    addField,
    updateField,
    removeField,
    reorderField,
    setCurrentLevel,
    createLevel,
    updateLevel,
  } = useLevelBuilderStore();

  // UI state
  const [selectedField, setSelectedField] = useState<KycField | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showFeatureManagement, setShowFeatureManagement] = useState(false);
  const [showVerificationServices, setShowVerificationServices] =
    useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState<
    "fields" | "presets" | "settings"
  >("fields");
  const [levelName, setLevelName] = useState("");
  const [levelDescription, setLevelDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Sidebar state history
  const [previousLeftSidebarState, setPreviousLeftSidebarState] =
    useState(true);
  const [previousRightSidebarState, setPreviousRightSidebarState] =
    useState(true);
  const [previousActiveSidebar, setPreviousActiveSidebar] = useState<
    "fields" | "presets" | "settings"
  >("fields");

  // Define types
  type KycField = any;
  type KycLevel = any;
  type KycFieldType = any;
  type LevelFeature = any;

  // Initialize a new level in create mode or fetch existing one
  useEffect(() => {
    if (!isEdit) {
      const newLevel: KycLevel = {
        id: makeUuid(),
        name: "New Level",
        description: "",
        status: "DRAFT",
        level: 1,
        fields: [],
        features: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setCurrentLevel(newLevel);
      setLevelName(newLevel.name);
    } else if (levelId) {
      fetchLevel(levelId).then(() => {
        // Ensure level name is set after fetching
        if (currentLevel) {
          setLevelName(currentLevel.name || "");
        }
      });
    }
  }, [isEdit, levelId, fetchLevel, setCurrentLevel]);

  // Add a separate effect to update UI state when currentLevel changes
  useEffect(() => {
    if (currentLevel) {
      setLevelName(currentLevel.name || "");
      setLevelDescription(currentLevel.description || "");
    }
  }, [currentLevel]);

  useEffect(() => {
    if (selectedField && showPreview && previewRef.current) {
      const fieldElement = previewRef.current.querySelector(
        `[data-field-id="${selectedField.id}"]`
      );
      if (fieldElement) {
        fieldElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [selectedField, showPreview]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    if (isFullscreen) {
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isFullscreen]);

  const getFields = useCallback((): KycField[] => {
    return currentLevel?.fields || [];
  }, [currentLevel]);

  const activeFields = getFields();
  const allFields = activeFields.sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  const saveCurrentSidebarState = () => {
    setPreviousLeftSidebarState(leftSidebarOpen);
    setPreviousRightSidebarState(rightSidebarOpen);
    setPreviousActiveSidebar(activeSidebar);
  };

  const restorePreviousSidebarState = () => {
    setLeftSidebarOpen(previousLeftSidebarState);
    setRightSidebarOpen(previousRightSidebarState);
    setActiveSidebar(previousActiveSidebar);
  };

  const handleSave = async () => {
    if (!currentLevel) {
      setLocalError("Level data is missing");
      return;
    }
    setIsSaving(true);
    setLocalError(null);
    try {
      // Only send enabled feature ids
      const enabledFeatureIds = (currentLevel.features || [])
        .filter((f) => f.enabled)
        .map((f) => f.id);

      const updatedLevel = {
        ...currentLevel,
        name: levelName || "New Level",
        description: levelDescription,
        features: enabledFeatureIds,
        updatedAt: new Date(),
      };

      if (isEdit) {
        await updateLevel(updatedLevel);
      } else {
        const nameToUse = levelName.trim() || "New Level";
        await createLevel(nameToUse);
        router.push("/admin/crm/kyc/level");
      }
    } catch (err: any) {
      console.error("Error saving level:", err);
      setLocalError(err.message || "Failed to save level");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddField = (type: KycFieldType, position?: number) => {
    console.log(
      `Adding field of type ${type} at position ${position ?? "end"}`
    );
    addField(type, position);
    if (currentLevel) {
      setTimeout(() => {
        const fields = currentLevel.fields;
        if (fields && fields.length > 0) {
          const newField =
            position !== undefined
              ? fields[position]
              : fields[fields.length - 1];
          if (newField) {
            setSelectedField(JSON.parse(JSON.stringify(newField)));
            if (fieldContainerRef.current) {
              const fieldElements = Array.from(
                fieldContainerRef.current.querySelectorAll("[data-field-id]")
              );
              const fieldIndex =
                position !== undefined ? position : fieldElements.length - 1;
              if (fieldElements[fieldIndex]) {
                fieldElements[fieldIndex].scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }
            }
          }
        }
      }, 50);
    }
  };

  const handleUpdateField = (updatedField) => {
    updateField(updatedField);
    setSelectedField(updatedField);
  };

  const handleRemoveField = (fieldId: string) => {
    removeField(fieldId);
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  const handleDuplicateField = (fieldId: string) => {
    if (currentLevel && currentLevel.fields) {
      const fieldToDuplicate = currentLevel.fields.find(
        (f) => f.id === fieldId
      );
      if (!fieldToDuplicate) return;
      const duplicatedField = JSON.parse(JSON.stringify(fieldToDuplicate));
      duplicatedField.id = makeUuid();
      duplicatedField.label = `${fieldToDuplicate.label} (Copy)`;
      duplicatedField.order = (fieldToDuplicate.order || 0) + 1;
      const adjustedFields = currentLevel.fields?.map((f) => ({
        ...f,
        order:
          f.order && f.order > (fieldToDuplicate.order || 0)
            ? f.order + 1
            : f.order,
      }));
      const updatedLevel = {
        ...currentLevel,
        fields: [...adjustedFields, duplicatedField].sort(
          (a, b) => (a.order || 0) - (b.order || 0)
        ),
      };
      setCurrentLevel(updatedLevel);
      setSelectedField(duplicatedField);
    }
  };

  const handleReorderFields = (
    sourceIndex: number,
    destinationIndex: number
  ) => {
    if (!currentLevel) return;
    const fieldId = allFields[sourceIndex].id;
    const updatedLevel = { ...currentLevel };
    const fields = [...(updatedLevel.fields || [])];
    const [movedField] = fields.splice(sourceIndex, 1);
    fields.splice(destinationIndex, 0, movedField);
    const reorderedFields = fields.map((field, index) => ({
      ...field,
      order: index,
    }));
    updatedLevel.fields = reorderedFields;
    setCurrentLevel(updatedLevel);
    reorderField(fieldId, destinationIndex);
  };

  const applyLevelPreset = (presetId: string) => {
    const preset = LEVEL_PRESETS.find((p) => p.id === presetId);
    if (!preset || !currentLevel) return;
    const updatedLevel = { ...currentLevel, fields: preset.fields as KycField[] };
    setCurrentLevel(updatedLevel);
    setLeftSidebarOpen(false);
  };

  const toggleGuideView = () => {
    if (!showGuide) {
      saveCurrentSidebarState();
      setLeftSidebarOpen(false);
      setRightSidebarOpen(false);
      setShowFeatureManagement(false);
      setShowPreview(false);
      setShowVerificationServices(false);
      setShowGuide(true);
    } else {
      restorePreviousSidebarState();
      setShowGuide(false);
    }
  };

  const toggleFeatureManagementView = () => {
    if (!showFeatureManagement) {
      saveCurrentSidebarState();
      setLeftSidebarOpen(false);
      setRightSidebarOpen(false);
      setShowGuide(false);
      setShowPreview(false);
      setShowVerificationServices(false);
      setShowFeatureManagement(true);
    } else {
      restorePreviousSidebarState();
      setShowFeatureManagement(false);
    }
  };

  const toggleVerificationServicesView = () => {
    if (!showVerificationServices) {
      saveCurrentSidebarState();
      setLeftSidebarOpen(false);
      setRightSidebarOpen(false);
      setShowGuide(false);
      setShowPreview(false);
      setShowFeatureManagement(false);
      setShowVerificationServices(true);
    } else {
      restorePreviousSidebarState();
      setShowVerificationServices(false);
    }
  };

  const togglePreviewView = () => {
    if (!showPreview) {
      saveCurrentSidebarState();
      setShowGuide(false);
      setShowFeatureManagement(false);
      setShowVerificationServices(false);
      setShowPreview(true);
    } else {
      restorePreviousSidebarState();
      setShowPreview(false);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      // Request full screen on the document element (or use a specific ref if desired)
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable full-screen mode:", err);
      });
    } else {
      // Exit full screen if currently in full screen mode
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.error("Error attempting to exit full-screen mode:", err);
        });
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleSidebarButtonClick = (
    sidebar: "fields" | "presets" | "settings"
  ) => {
    if (sidebar === "settings") {
      if (
        showFeatureManagement ||
        showGuide ||
        showPreview ||
        showVerificationServices
      ) {
        setShowFeatureManagement(false);
        setShowGuide(false);
        setShowPreview(false);
        setShowVerificationServices(false);
      }
      setActiveSidebar("settings");
      setLeftSidebarOpen(true);
      return;
    }
    if (
      showFeatureManagement ||
      showGuide ||
      showPreview ||
      showVerificationServices
    ) {
      setShowFeatureManagement(false);
      setShowGuide(false);
      setShowPreview(false);
      setShowVerificationServices(false);
      setActiveSidebar(sidebar);
      setLeftSidebarOpen(true);
      setRightSidebarOpen(previousRightSidebarState);
    } else {
      if (activeSidebar === sidebar && leftSidebarOpen) {
        setLeftSidebarOpen(false);
      } else {
        setActiveSidebar(sidebar);
        setLeftSidebarOpen(true);
      }
    }
  };

  const handleSaveFeatures = (
    features: LevelFeature[],
    levelData?: {
      name: string;
      description: string;
      level: number;
      status: "ACTIVE" | "DRAFT" | "INACTIVE";
    }
  ) => {
    if (!currentLevel) return;
    const updatedLevel: KycLevel = {
      ...currentLevel,
      features,
      ...(levelData && {
        name: levelData.name,
        description: levelData.description,
        level: levelData.level,
        status: levelData.status,
      }),
    };
    if (levelData) {
      setLevelName(levelData.name);
      setLevelDescription(levelData.description);
    }
    setCurrentLevel(updatedLevel);
  };

  const handleUpdateLevelFromVerificationServices = (
    updatedLevel: KycLevel
  ) => {
    setCurrentLevel(updatedLevel);
    toggleVerificationServicesView();
  };

  // Show error state if there's an error
  if (error && isEdit) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{'Error'}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <div className="mt-4">
          <Button onClick={() => router.push("/admin/kyc/levels")}>
            {t("return_to_levels")}
          </Button>
        </div>
      </Alert>
    );
  }

  // Show the normal UI for create mode or when edit mode has loaded successfully
  return (
    <TooltipProvider>
      <div
        className={`flex h-screen w-full overflow-x-hidden dark:bg-zinc-950 ${isFullscreen ? "fixed inset-0 z-50 bg-background dark:bg-zinc-950" : ""}`}
      >
        <VerticalIconBar
          activeSidebar={activeSidebar}
          leftSidebarOpen={leftSidebarOpen}
          showFeatureManagement={showFeatureManagement}
          showGuide={showGuide}
          showVerificationServices={showVerificationServices}
          isFullscreen={isFullscreen}
          onSidebarButtonClick={handleSidebarButtonClick}
          onToggleGuide={toggleGuideView}
          onToggleFullscreen={toggleFullscreen}
          onToggleFeatures={toggleFeatureManagementView}
          onToggleVerificationServices={toggleVerificationServicesView}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <BuilderHeader
            loading={isEdit && (isLoading || (!currentLevel && !error))}
            levelName={levelName}
            setLevelName={setLevelName}
            showPreview={showPreview}
            setShowPreview={setShowPreview}
            handleSave={handleSave}
            isSaving={isSaving}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
            levelNumber={currentLevel?.level || 1}
            hideViewControls={true}
            onPreviewClick={togglePreviewView}
            isEdit={isEdit}
          />

          {localError && (
            <Alert variant="destructive" className="mx-4 mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{'Error'}</AlertTitle>
              <AlertDescription>{localError}</AlertDescription>
            </Alert>
          )}

          <div className="flex-1 flex overflow-hidden relative">
            <AnimatePresence>
              {leftSidebarOpen &&
                !showFeatureManagement &&
                !showGuide &&
                !showPreview &&
                !showVerificationServices && (
                  <LeftSidebar
                    activeSidebar={activeSidebar}
                    handleAddField={addField}
                    applyLevelPreset={applyLevelPreset}
                    setLeftSidebarOpen={setLeftSidebarOpen}
                    levelNumber={currentLevel?.level || 1}
                    setLevelNumber={(level) => {
                      if (currentLevel) {
                        const updatedLevel = { ...currentLevel, level };
                        setCurrentLevel(updatedLevel);
                      }
                    }}
                    levelDescription={levelDescription}
                    setLevelDescription={(description) => {
                      setLevelDescription(description);
                    }}
                    levelName={levelName}
                    setLevelName={(name) => {
                      setLevelName(name);
                    }}
                    status={currentLevel?.status || "DRAFT"}
                    setStatus={(status) => {
                      if (currentLevel) {
                        const updatedLevel = { ...currentLevel, status };
                        setCurrentLevel(updatedLevel);
                      }
                    }}
                    currentLevel={currentLevel}
                    setCurrentLevel={setCurrentLevel}
                    onOpenVerificationServices={toggleVerificationServicesView}
                  />
                )}
            </AnimatePresence>

            {showFeatureManagement ? (
              <FeatureManagement
                onBack={() => toggleFeatureManagementView()}
                levelNumber={currentLevel?.level || 1}
                levelName={levelName}
                onSave={handleSaveFeatures}
                existingFeatures={currentLevel?.features || []}
              />
            ) : showGuide ? (
              <Guide onClose={() => toggleGuideView()} />
            ) : showVerificationServices ? (
              <VerificationServicesView
                onBack={() => toggleVerificationServicesView()}
                currentLevel={currentLevel}
                onUpdateLevel={handleUpdateLevelFromVerificationServices}
              />
            ) : showPreview ? (
              <FormPreview
                previewRef={previewRef}
                activeFields={activeFields}
                formData={formData}
                setFormData={setFormData}
                selectedField={selectedField}
                setShowPreview={setShowPreview}
                setLeftSidebarOpen={setLeftSidebarOpen}
                setRightSidebarOpen={setRightSidebarOpen}
                previousLeftSidebarState={previousLeftSidebarState}
                previousRightSidebarState={previousRightSidebarState}
                setPreviousLeftSidebarState={setPreviousLeftSidebarState}
                setPreviousRightSidebarState={setPreviousRightSidebarState}
                levelName={levelName}
                levelDescription={levelDescription}
              />
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <BuilderContent
                  loading={isEdit && (isLoading || (!currentLevel && !error))}
                  levelNumber={currentLevel?.level || 1}
                  handleAddField={handleAddField}
                  localError={localError}
                  filteredFields={allFields}
                  selectedField={selectedField}
                  setSelectedField={(field) => {
                    setSelectedField(field);
                    if (field) {
                      setRightSidebarOpen(true);
                    }
                  }}
                  handleDuplicateField={handleDuplicateField}
                  handleRemoveField={handleRemoveField}
                  fieldContainerRef={fieldContainerRef}
                  handleReorderFields={handleReorderFields}
                  setRightSidebarOpen={setRightSidebarOpen}
                />
              </div>
            )}

            <AnimatePresence>
              {rightSidebarOpen &&
                !showFeatureManagement &&
                !showGuide &&
                !showPreview &&
                !showVerificationServices && (
                  <RightSidebar
                    selectedField={selectedField}
                    setSelectedField={setSelectedField}
                    handleUpdateField={handleUpdateField}
                    activeFields={activeFields}
                    setRightSidebarOpen={setRightSidebarOpen}
                    handleAddField={handleAddField}
                    levelNumber={currentLevel?.level || 1}
                  />
                )}
            </AnimatePresence>
          </div>

          {!showFeatureManagement && !showVerificationServices && (
            <BuilderFooter
              activeFields={activeFields}
              isEdit={isEdit}
              levelNumber={currentLevel?.level || 1}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
