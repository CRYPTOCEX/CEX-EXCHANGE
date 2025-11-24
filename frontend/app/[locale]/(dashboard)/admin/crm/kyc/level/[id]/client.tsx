"use client";

import { useParams } from "next/navigation";
import LevelBuilder from "../../components/level-builder";

export default function LevelEditorClient() {
  const { id } = useParams() as { id: string };
  return (
    <div className="h-screen w-full">
      <LevelBuilder levelId={id} isEdit={true} />
    </div>
  );
}
