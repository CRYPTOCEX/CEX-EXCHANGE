/**
 * The framer-motion feature bundle, isolated in its own module so it can be
 * reached ONLY through `import()`.
 *
 * This file exists because of the mistake it replaces. `lazy-motion-provider`
 * used to do `import { domMax } from "framer-motion"` at the top of the file
 * and hand the resolved object straight to `<LazyMotion features={...}>`. That
 * defeats LazyMotion entirely: the whole point of the component is that the
 * feature set (gestures, drag, layout projection, the animation drivers) is
 * fetched as a separate chunk after hydration, but a static import puts every
 * one of those modules in the graph of the provider — and the provider is in
 * `provider/providers.tsx`, which every route renders. So the bundle shipped
 * in the baseline chunk anyway and LazyMotion bought nothing but an extra
 * context. The lazy form only works if NOTHING in the synchronous graph names
 * `domMax`; keeping that reference in a leaf module of its own is how we make
 * that checkable — if anything else ever imports `domMax` directly, the win
 * silently disappears with no error.
 *
 * Why `domMax` and not the smaller `domAnimation`: `domMax` = `domAnimation`
 * + pan + drag + LAYOUT PROJECTION. We use no drag props anywhere, but
 * `components/partials/header/site-header.tsx` renders `layout layoutScroll
 * layoutRoot` on the header element and a `layoutId` further down — that is a
 * baseline component on every single route, and without the projection
 * feature those props are silently inert.
 *
 * No "use client" directive: this module is only ever reached from an
 * `import()` inside a client module, so it is already in the client graph, and
 * a directive here would only add a pointless boundary entry.
 */

import { domMax } from "framer-motion";

export default domMax;
