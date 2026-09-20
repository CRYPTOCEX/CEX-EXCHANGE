"use client";

import { PostEditor } from "@/components/blocks/blog/post-editor";

/**
 * Was a bespoke frame — `bg-card pt-24` plus two fixed gradient washes,
 * `FloatingShapes` and an `InteractivePattern` — wrapped around a tabbed
 * editor. None of that survives: the editor is the same full page the admin
 * side mounts, and it brings its own `PageShell` ground, container and
 * clearance, so a second frame here would double the padding and paint a
 * ground the shell already owns.
 */
export function NewPostClient() {
  return <PostEditor scope="author" />;
}
