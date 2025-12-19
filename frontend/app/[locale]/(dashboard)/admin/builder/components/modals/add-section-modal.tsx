"use client";
import { useBuilderStore } from "@/store/builder-store";
import Modal from "@/components/ui/modal";
import { SectionSelector } from "./section-selector";
import type { Section } from "@/types/builder";
import { useTranslations } from "next-intl";

export function AddSectionModal() {
  const t = useTranslations("dashboard_admin");
  const { addSection, toggleAddSectionModal } = useBuilderStore();

  const handleSelectTemplate = (section: Section) => {
    addSection(section);
    toggleAddSectionModal();
  };

  return (
    <Modal
      title={t("insert_section")}
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
