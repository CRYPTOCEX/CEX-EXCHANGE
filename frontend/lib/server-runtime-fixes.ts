/**
 * Node-runtime fixes that must run before any route module is evaluated.
 * Imported for its side effects by `instrumentation.ts`, which Next.js calls
 * once at server boot — the only hook that reliably wins the race against a
 * third-party module body.
 *
 * Kept out of `instrumentation.ts` itself because that file is compiled for the
 * Edge runtime as well, and `process.execArgv` below is Node-only: leaving it
 * there made the bundler print an "A Node.js API is used … not supported in the
 * Edge Runtime" warning on every compile. A runtime guard does not help, since
 * the complaint comes from static analysis.
 *
 * Both problems here trace to the same dependency — @reown/appkit and the
 * @walletconnect stack under it. `components/auth/auth-modal.tsx` now loads its
 * wallet form client-side only, which keeps that stack out of the server graph
 * for every route with no wallet UI. The NFT pages and the profile wallet tab
 * still import appkit directly and legitimately, so the server keeps evaluating
 * it there; this file is what stops those routes from reprinting the same two
 * unactionable lines on every compile.
 */

// Seeds Lit's warning-dedupe set so its dev build stops announcing itself on
// every compile. Kept in its own module because the browser needs the same seed
// from the inline script in the root layout. See that file for why this
// silences only `dev-mode` and leaves every other Lit warning working.
import "./silence-lit-dev-warning";

/**
 * Node 26 defines `globalThis.localStorage` as a lazy getter. Read it without
 * `--localstorage-file` and it prints
 *
 *     ExperimentalWarning: localStorage is not available because
 *     --localstorage-file was not provided
 *
 * then returns undefined. `@walletconnect/keyvaluestorage` reads it in its
 * module body — `typeof g !== "undefined" && g.localStorage ? … : new MemoryStore()`
 * — which is a correct feature detection for a package shipping one bundle for
 * browser and server. It just happens to trip the getter, and the warning lands
 * in our terminal with no stack and nothing to act on.
 *
 * Deleting the stub restores exactly the semantics that detection expects, and
 * that every Node before 26 had: the property is absent, `typeof localStorage`
 * is "undefined", and a bare read throws ReferenceError. Every consumer takes
 * the branch it already took — the getter returned undefined too — so this
 * changes no behaviour, only the noise. It also un-breaks the feature
 * detections Node 26 silently defeated: the ones that read localStorage inside
 * a try/catch and treat a throw as "unavailable" stopped catching anything the
 * moment the read started succeeding with undefined.
 *
 * Skipped when `--localstorage-file` is present, where localStorage is real and
 * deliberate.
 */
function removeUnusableWebStorageStubs(): void {
  const optedIn = [...process.execArgv, process.env.NODE_OPTIONS ?? ""].some(
    (arg) => arg.includes("--localstorage-file")
  );
  if (optedIn) return;

  for (const key of ["localStorage", "sessionStorage"] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    // Only the lazy stub, which is an accessor. A real Storage is a data
    // property and is left alone.
    if (descriptor?.configurable && descriptor.get) {
      delete (globalThis as unknown as Record<string, unknown>)[key];
    }
  }
}

removeUnusableWebStorageStubs();

export {};
