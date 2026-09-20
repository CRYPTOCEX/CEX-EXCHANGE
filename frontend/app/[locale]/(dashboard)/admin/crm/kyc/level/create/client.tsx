"use client";

import LevelBuilderComponent from "../../components/level-builder";

export default function LevelCreatorClient() {

  return (
    <div className={`h-screen w-full`}>
      <LevelBuilderComponent isEdit={false} />
    </div>
  );
}
