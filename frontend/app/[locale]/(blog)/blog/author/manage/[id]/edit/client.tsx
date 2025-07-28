"use client";

import { useParams } from "next/navigation";
import { PostEditor } from "../../components/post-editor";

export function EditPostClient() {
  const { id } = useParams() as { id: string };
  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-white dark:bg-black">
      <PostEditor postId={id} />
    </div>
  );
}
