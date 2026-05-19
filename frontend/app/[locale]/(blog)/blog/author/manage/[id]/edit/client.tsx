"use client";

import { useParams } from "next/navigation";
import { PostEditor } from "../../components/post-editor";
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";

export function EditPostClient() {
  const { id } = useParams() as { id: string };
  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-zinc-950 pt-24">
      {/* Premium Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.03) 10%, rgba(139, 92, 246, 0.02) 30%, transparent 60%)`,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)`,
        }}
      />
      <FloatingShapes
        count={6}
        interactive={true}
        theme={{ primary: "indigo", secondary: "purple" }}
      />
      <InteractivePattern
        config={{
          enabled: true,
          variant: "crosses",
          opacity: 0.015,
          size: 40,
          interactive: true,
        }}
      />
      <div className="relative z-10 container mx-auto px-4 pb-16">
        <PostEditor postId={id} />
      </div>
    </div>
  );
}
