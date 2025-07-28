// Shared default classes so you don't need to repeat them.
export const defaultInputClass = "h-7 text-xs";

// List helper functions
export function parseListItems(
  content: string
): { id: string; text: string; level: number }[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content || "", "text/html");
  const listElements = doc.querySelectorAll("li");
  const time = Date.now();
  if (listElements.length === 0) {
    return [
      { id: `item-${time}-1`, text: "List item 1", level: 0 },
      { id: `item-${time}-2`, text: "List item 2", level: 0 },
      { id: `item-${time}-3`, text: "List item 3", level: 0 },
    ];
  }
  return Array.from(listElements).map((li, index) => {
    let level = 0;
    let parent = li.parentElement;
    while (parent && (parent.tagName === "UL" || parent.tagName === "OL")) {
      if (parent.parentElement && parent.parentElement.tagName === "LI") {
        level++;
      }
      parent = parent.parentElement;
    }
    return { id: `item-${time}-${index}`, text: li.textContent || "", level };
  });
}

export function buildNestedList(
  items: { id: string; text: string; level: number }[],
  listType: string,
  level = 0,
  startIndex = 0
): { html: string; lastIndex: number } {
  let html = "";
  const tag = listType === "ordered" ? "ol" : "ul";
  html += `<${tag}>`;
  let i = startIndex;
  while (i < items.length) {
    const item = items[i];
    if (item.level < level) break;
    if (item.level === level) {
      html += `<li>${item.text}`;
      if (i + 1 < items.length && items[i + 1].level > level) {
        const result = buildNestedList(items, listType, level + 1, i + 1);
        html += result.html;
        i = result.lastIndex;
      }
      html += `</li>`;
    }
    i++;
  }
  html += `</${tag}>`;
  return { html, lastIndex: i - 1 };
}
