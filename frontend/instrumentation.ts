/**
 * Next.js calls `register()` once when the server boots, before any route
 * module is compiled or evaluated.
 *
 * This file is compiled for the Edge runtime as well as Node, so it must not
 * reference Node-only APIs directly — the bundler flags them statically, and a
 * runtime guard is not enough to quiet it. The work therefore lives in a
 * separate module behind a `NEXT_RUNTIME` check written in the positive form,
 * which is the shape Next.js can fold away when it builds the Edge bundle.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/server-runtime-fixes");
  }
}
