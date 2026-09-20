import { RefObject, useEffect } from "react";

/**
 * Elements that are visually INSIDE the panel but are DOM siblings of it,
 * because Radix portals every floating layer to `document.body`.
 *
 * Without this, a plain `!ref.contains(target)` test treats picking an item
 * from a <Select>, a dropdown menu, a date picker or a nested dialog as a click
 * outside — so the panel closes the instant the user makes a choice inside it.
 * That is why rich content in the expanded row/card dialog was effectively
 * limited to read-only markup: any real control dismissed its own host.
 */
const PORTALED_LAYER_SELECTOR = [
  "[data-radix-popper-content-wrapper]",
  "[data-radix-portal]",
  "[data-slot='dialog-content']",
  "[data-slot='dialog-overlay']",
  "[data-slot='alert-dialog-content']",
  "[data-slot='alert-dialog-overlay']",
  "[data-slot='drawer-content']",
  "[data-slot='sheet-content']",
  "[role='menu']",
  "[role='listbox']",
  "[role='dialog']",
  "[role='alertdialog']",
  "[data-sonner-toaster]",
].join(",");

export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  callback: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!ref.current || !target) return;
      if (ref.current.contains(target)) return;

      // A click that landed in a portaled floating layer belongs to whatever
      // opened it, which may well be this panel.
      const element =
        target instanceof Element
          ? target
          : ((target as any)?.parentElement as Element | null);
      if (element?.closest(PORTALED_LAYER_SELECTOR)) return;

      callback(event);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [ref, callback]);
}
