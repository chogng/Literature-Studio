// Shared action model that can be reused across browser and non-browser layers.
// Keep this contract free of DOM/event types.
export interface BaseAction {
  id?: string;
  label: string;
  title?: string;
  disabled?: boolean;
  checked?: boolean;
  run?: () => void;
}
