"use client";
import { useBuilderStore } from "@/store/builder-store";
import Modal from "@/components/ui/modal";
import { SectionSelector } from "./section-selector";
import type { Section } from "@/types/builder";
import { useTranslations } from "next-intl";
import { freshenIds } from "../../templates/utils";

export function AddSectionModal() {
  const t = useTranslations("dashboard_admin");
  const { addSection, toggleAddSectionModal } = useBuilderStore();

  const handleSelectTemplate = (section: Section) => {
    // Regenerate every internal id so inserting the same template twice on
    // one page doesn't collide (template ids are stable slugs).
    addSection(freshenIds(section));
    toggleAddSectionModal();
  };

  return (
    <Modal
      title={t("insert_section")}
      onClose={toggleAddSectionModal}
      color="purple"
      className="max-w-6xl w-[80vw] h-[80vh]"
      showHeader={false}
    >
      <SectionSelector
        onSelectTemplate={handleSelectTemplate}
        onClose={toggleAddSectionModal}
      />
    </Modal>
  );
}
