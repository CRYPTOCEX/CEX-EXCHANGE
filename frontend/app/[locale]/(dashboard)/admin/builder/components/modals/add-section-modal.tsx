"use client";
import { useBuilderStore } from "@/store/builder-store";
import Modal from "@/components/ui/modal";
import { SectionSelector } from "./section-selector";
import type { Section } from "@/types/builder";

export function AddSectionModal() {
  const { addSection, toggleAddSectionModal } = useBuilderStore();

  const handleSelectTemplate = (section: Section) => {
    addSection(section);
    toggleAddSectionModal();
  };

  return (
    <Modal
      title="Insert Section"
      onClose={toggleAddSectionModal}
      color="purple"
      className="max-w-6xl w-[80vw] h-[80vh] dark:bg-background dark:border-border"
      showHeader={false}
    >
      <SectionSelector
        onSelectTemplate={handleSelectTemplate}
        onClose={toggleAddSectionModal}
      />
    </Modal>
  );
}
