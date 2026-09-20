export interface AdvancedTabProps {
  elementId: string;
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
  structureType?: "section" | "row" | "column";
  elementType?: string;
}

export interface ComponentProps {
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
  [key: string]: any;
}

export interface Attribute {
  name: string;
  value: string;
}

export interface Condition {
  type: string;
  value: string;
}

export interface RemoveButtonProps {
  onRemove: () => void;
}

export interface ScrollEffectSettings {
  enableScrollEffects?: boolean;
  scrollEffectType?: string;
  scrollTriggerPosition?: number;
  scrollEffectDuration?: number;
  scrollEffectIntensity?: number;
  scrollEffectEasing?: string;
  scrollEffectOnce?: boolean;
  scrollEffectDelay?: number;
  scrollEffectThreshold?: number;
  scrollEffectReverseDirection?: boolean;
  scrollEffectStartValue?: number;
  scrollEffectEndValue?: number;
  scrollEffectReverse?: boolean; // Added this property
}
