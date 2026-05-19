import { produce, enablePatches, applyPatches, Objectish } from "immer";

// Enable patches in Immer
enablePatches();

export type Patch = any;

export interface HistoryEntry {
  patches: Patch[];
  inversePatches: Patch[];
  action: string;
}

/**
 * Creates patches between two states
 */
export function createPatch<T>(currentState: T, nextState: T): Patch[] {
  let patches: Patch[] = [];

  // Use Immer's produce with patches enabled
  produce(
    currentState,
    (draft) => {
      // This is a special case where we're not actually modifying the draft
      // We're just using produce to generate patches between currentState and nextState
      Object.keys(nextState as object).forEach((key) => {
        draft[key] = nextState[key];
      });
    },
    (p) => {
      patches = p;
    }
  );

  return patches;
}

/**
 * Applies patches to a state
 */

export function applyPatch<T extends Objectish>(state: T, patches: Patch[]): T {
  return applyPatches(state, patches);
}

/**
 * Creates a history entry from a state change
 */
export function createHistoryEntryFromChange<T>(
  baseState: T,
  newState: T,
  action = "State change"
): HistoryEntry | null {
  // Create forward and inverse patches
  const patches = createPatch(baseState, newState);
  const inversePatches = createPatch(newState, baseState);

  // If no changes were made, return null
  if (patches.length === 0) {
    return null;
  }

  return {
    patches,
    inversePatches,
    action,
  };
}
