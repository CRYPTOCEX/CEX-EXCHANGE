import * as React from "react";

/**
 * "Has this tree hydrated yet?" — false on the server AND for the hydration
 * render, true from the first client commit onward.
 *
 * WHY NOT `useState(false)` + `useEffect(() => setMounted(true), [])`.
 * That is the shape this hook had, and it answers the question correctly, but
 * it answers it by scheduling a state update the moment the component commits.
 * React's own lint rule (`react-hooks/set-state-in-effect`) rejects it because
 * a setState in an effect body is a cascading render: the tree commits, then
 * immediately re-renders, and any component that reads this hook re-renders
 * with it.
 *
 * `useSyncExternalStore` asks exactly the same question with no state and no
 * effect. The third argument is the SERVER snapshot, which React also uses for
 * the hydration render — that is precisely the "not yet" half — and the second
 * is the client snapshot, used from the first commit onward. Nothing ever
 * changes, so `subscribe` has nothing to subscribe to.
 *
 * Both callbacks are module-level constants on purpose: a fresh `subscribe`
 * identity on every render makes React tear down and re-establish the
 * subscription each time.
 */
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function useMounted() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
