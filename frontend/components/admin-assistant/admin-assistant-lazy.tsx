"use client";

/**
 * The admin assistant, behind a chunk boundary.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS AT ALL
 * ---------------------------------------------------------------------------
 * `app/[locale]/layout.tsx` mounts the assistant above the router, which is
 * correct and deliberate — an admin procedure carries somebody across route
 * groups and the rail must outlive those navigations (see the comment at the
 * mount site). The cost of that placement was that `admin-assistant.tsx` — 1,870
 * lines, 75,348 bytes of `"use client"` — was a STATIC import of the root
 * layout, so it landed in the bundle every single visitor downloads and parses.
 *
 * Practically none of them can ever see it. The component returns `null` unless
 * the visitor is signed in, standing on `/admin`, AND the server has confirmed
 * the AI Support add-on is enabled for this install. A logged-out visitor on the
 * marketing homepage was paying full price for a component that is structurally
 * incapable of rendering anything for them.
 *
 * ---------------------------------------------------------------------------
 * WHY THE WRAPPER IS A SEPARATE CLIENT MODULE
 * ---------------------------------------------------------------------------
 * `next/dynamic` with `ssr: false` is a build error inside a Server Component,
 * and the locale layout is one. So the dynamic call lives here, in a `"use
 * client"` module, and the layout imports this instead. Same shape as
 * `context/wallet-lazy.tsx`, which exists for the same reason.
 *
 * ---------------------------------------------------------------------------
 * WHY `ssr: false` IS CORRECT AND NOT MERELY CONVENIENT
 * ---------------------------------------------------------------------------
 * The assistant's server render is unconditionally `null`, and that is provable
 * from its own guards rather than assumed:
 *
 *   - `signedIn` comes from `useUserStore`, which hydrates asynchronously, so it
 *     is false on the server and the first `return null` fires.
 *   - `prefersPinned` initialises to `false` when `window` is undefined (it
 *     reads `localStorage` in the state initialiser — during render — on purpose;
 *     see the comment there), so `pinned` is false server-side.
 *   - `live` — the add-on gate — starts `null` and is only ever set by a poll,
 *     which is an effect and does not run on the server, so `live === null`
 *     returns `pinned ? <RailSkeleton/> : null`, and `pinned` is false.
 *
 * With `pinned` false and `live` null the component takes `return null` before
 * it renders a single element. Dropping SSR therefore removes exactly nothing
 * from the HTML, and it additionally spares the server from evaluating 75 KB of
 * interactive component on every request.
 *
 * The one behaviour that does change is small and worth knowing: a PINNED
 * administrator reloading `/admin` used to get `<RailSkeleton />` in the gutter
 * on the first hydrated frame, and now gets it once this chunk arrives. There is
 * no layout shift either way — the blocking boot script in the layout's <head>
 * has already reserved the 26rem gutter before first paint, which is the thing
 * that actually matters — so the gutter is simply empty for the length of a
 * local static asset fetch, against a poll round-trip it was already waiting on.
 *
 * ---------------------------------------------------------------------------
 * `loading` RENDERS NOTHING, DELIBERATELY — THE OPPOSITE TRADE TO wallet-lazy
 * ---------------------------------------------------------------------------
 * `wallet-lazy.tsx` wraps its chunk in an error boundary that renders a visible
 * "could not be loaded / reload" card, because there the failure blanks a
 * subtree the user is looking at. Here it must NOT. This component is mounted on every route in the product,
 * including the storefront, and `loading` is called while the chunk is in flight
 * or has failed — for everybody, admin or not. An error banner here would put
 * "Assistant could not be loaded" on a logged-out visitor's homepage, over a
 * panel they were never going to be shown.
 *
 * So a failed chunk costs an administrator the rail until they reload, which is
 * a degradation, and costs everyone else nothing, which is the point.
 */

import dynamic from "next/dynamic";

/* ---------------------------------------------------------------------------
   THIS `import type` IS LOAD-BEARING. DO NOT INLINE IT AWAY.
   ---------------------------------------------------------------------------
   It is erased by the compiler — `isolatedModules` is on and nothing here sets
   `verbatimModuleSyntax`, so a type-only import contributes zero bytes and
   cannot drag `admin-assistant.tsx` back into this chunk. Its runtime cost is
   nil. Its build-time job is not.

   `i18n/key-extractor.js` builds the per-route key sets by crawling STATIC
   `import … from` / `export … from` edges (key-extractor.js, the importMatches
   loop). It has a `dynamicImport` regex sitting in its pattern table and NEVER
   USES IT — so `import("./admin-assistant")` below is invisible to it, and the
   crawl of the `app/[locale]` layout chain would dead-end right here.

   Measured, with the extractor itself, on this exact chain:

     layout chain alone       199 keys / 5 namespaces
     layout chain + assistant 231 keys / 7 namespaces

   — so severing the edge drops 32 keys out of the CORE set: 23 of
   `ext_admin_ai_support` (the `rail.*` labels), 8 of `common`, 1 of `ext`.
   About 1.5 KB of `en`.

   Losing them is not a missing label, it is a bill. A key that is not in core
   and not in the route chunk renders humanized text and fires the missing-key
   rescue in `i18n/context.tsx`, and that rescue downloads the whole 1.45 MB
   locale file. Every administrator arriving at `/admin` would pay it, to save
   1.5 KB on everyone else's homepage. That is the wrong side of a thousand-to-
   one trade, so the edge is kept.

   The type is CONSTRAINING the loader below, not imported for the side effect.
   An unreferenced import is what a future tidy-up deletes without knowing what
   it was for, and a decorative one is no better — `ComponentProps<typeof …>` of
   a zero-argument component widens to `unknown` and checks nothing. Annotating
   the loader's return does check something real: rename or re-shape the default
   export of `admin-assistant.tsx` and this file stops compiling, which is the
   only way a build ever notices that the two halves have drifted apart.
   --------------------------------------------------------------------------- */
import type AdminAssistantComponent from "./admin-assistant";

const loadAdminAssistant = (): Promise<typeof AdminAssistantComponent> =>
  import("./admin-assistant").then((mod) => mod.default);

const AdminAssistantInner = dynamic(loadAdminAssistant, {
  ssr: false,
  loading: ({ error }) => {
    /* THE FAILURE PATH RELEASES THE GUTTER, BECAUSE NOTHING ELSE WILL.
       -----------------------------------------------------------------------
       The rail is not the only thing this component owns. The blocking
       `railBootScript` in `app/[locale]/layout.tsx` puts
       `data-assistant-pinned="true"` on <html> BEFORE FIRST PAINT for a pinned
       admin, and `globals.css` hangs a great deal off that attribute: 26rem of
       `padding-inline-end` on <body> (:2997), and `display:none` on the navbar
       logo, the logo name, the area-switch label and the COMMAND TRIGGER
       (:3046-3049).

       The only code in the repo that ever takes the attribute back off is the
       layout effect inside `admin-assistant.tsx` (its three
       `applyPinnedAttribute(false)` calls) — grep `applyPinnedAttribute`, there
       is no other caller. While this was a static import of the root layout
       that effect ran whenever the page hydrated at all. Behind `dynamic()` it
       runs only IF THE CHUNK ARRIVES.

       So without this branch, one 404 on a stale chunk URL after a deploy
       leaves a pinned administrator with 26rem of empty page, no logo and no
       command trigger, and NO control anywhere that undoes it — reloading
       re-runs the boot script from the same localStorage value, so the state
       is sticky until they clear site data.

       This is why the trade is not symmetric with `wallet-lazy.tsx`, which
       this file's header cites. Wallet-lazy's failure blanks a subtree the user
       is looking at; this one corrupts the chrome AROUND it. Hence: still no
       visible error (see the header — that would put a broken-assistant notice
       on a logged-out visitor's homepage), but the layout damage is undone.

       Written against `document` rather than `applyPinnedAttribute` on purpose:
       the fallback must stay dependency-free, or importing `session-store` here
       pulls it into the wrapper chunk that this whole file exists to keep
       empty. */
    if (error && typeof document !== "undefined") {
      document.documentElement.removeAttribute("data-assistant-pinned");
    }
    return null;
  },
});

export default function AdminAssistantLazy() {
  return <AdminAssistantInner />;
}
