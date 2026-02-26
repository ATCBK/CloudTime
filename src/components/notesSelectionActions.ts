export const FLOATING_SELECTION_ACTIONS = [
  "blockMenu",
  "bold",
  "italic",
  "underline",
  "alignLeft",
  "alignCenter",
  "alignRight",
  "clear",
  "comment",
  "link",
  "code"
] as const;

export const CONTEXT_SELECTION_ACTIONS = [...FLOATING_SELECTION_ACTIONS] as const;

export type SelectionActionId = typeof FLOATING_SELECTION_ACTIONS[number];

// Keep selection block menu fully aligned with top toolbar block menu.
export const SELECTION_BLOCK_MENU_COMPACT = false;
