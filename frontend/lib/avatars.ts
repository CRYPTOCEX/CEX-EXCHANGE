/**
 * The avatar library that ships with the platform.
 * ============================================================================
 *
 * Twenty-six illustrated portraits live at `public/img/avatars/1.svg` …
 * `26.svg`. They have shipped since the first release and, until the picker
 * was built, NOTHING referenced them — every avatar surface in the app read
 * `user.avatar || "/img/avatars/placeholder.webp"`, so the twenty-six were
 * dead weight in the bundle and the only face a new account could have was the
 * grey placeholder or a photo they had to go and find.
 *
 * WHY A LIST AND NOT A `readdir`
 *
 * The frontend cannot read its own `public/` at runtime, and in production Next
 * indexes that directory ONCE at boot — so a file added later 404s until the
 * process restarts. Enumerating here means the picker and the file tree can
 * disagree loudly (a broken tile) instead of quietly (an empty gallery).
 *
 * WHAT THIS SET IS, AND WHAT IT IS NOT
 *
 * All twenty-six are human portraits in one illustration style: flat colour
 * ground, shoulders-up, no outline. There is no robot set, no animal set and no
 * animated set anywhere in the repo — checked across `public/`, the mobile app
 * and the store. Adding category tabs over this list would label one style as
 * four, so the gallery presents it as what it is. When a second style is drawn
 * or licensed, give it its own `AvatarSet` below and the picker groups itself.
 */

export interface AvatarSet {
  id: string;
  /** `common` translation key for the group heading. */
  labelKey: string;
  paths: string[];
}

const PORTRAIT_COUNT = 26;

export const AVATAR_SETS: readonly AvatarSet[] = [
  {
    id: "portraits",
    labelKey: "avatar_set_portraits",
    paths: Array.from({ length: PORTRAIT_COUNT }, (_, i) => `/img/avatars/${i + 1}.svg`),
  },
];

/** Every shipped avatar path, flat. */
export const BUILT_IN_AVATARS: readonly string[] = AVATAR_SETS.flatMap((s) => s.paths);

/** The face shown when an account has chosen nothing. Not selectable. */
export const AVATAR_PLACEHOLDER = "/img/avatars/placeholder.webp";

/**
 * Is this path one of OURS, rather than something the user uploaded?
 *
 * Load-bearing on the upload path. `imageUploader` takes an `oldPath` and the
 * server is meant to delete it — `removeOldImageSecurely` happens to fail
 * containment today and delete nothing, but that is a BUG on somebody's list,
 * not a guarantee. Handing it `/img/avatars/7.svg` would queue the deletion of
 * a file every other account on the install is also using, the first time that
 * bug is fixed. So a built-in avatar is never passed as an old path.
 */
export function isBuiltInAvatar(path: string | null | undefined): boolean {
  return !!path && path.startsWith("/img/avatars/");
}
