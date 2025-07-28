"use client";

import { useRouter } from "@/i18n/routing";
import LevelBuilderComponent from "../../components/level-builder";

export default function LevelCreatorClient() {
  const router = useRouter();

  return (
    <div className="h-screen w-full">
      <LevelBuilderComponent isEdit={false} />
    </div>
  );
}
