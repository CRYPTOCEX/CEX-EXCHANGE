export type ThemeColor = {
  light: string;
  dark: string;
};

export type GradientColor = {
  type: "gradient";
  gradient: {
    direction: string;
    from: string;
    via?: string;
    to: string;
    light?: {
      direction: string;
      from: string;
      via?: string;
      to: string;
    };
    dark?: {
      direction: string;
      from: string;
      via?: string;
      to: string;
    };
  };
};

export type ColorValue = string | ThemeColor | GradientColor;

// Core structure interfaces
export interface Element {
  id: string;
  type: string;
  content?: string;
  settings?: {
    // Element dimensions
    width?: string;
    height?: string;
    minWidth?: string;
    maxWidth?: string;
    minHeight?: string;
    maxHeight?: string;
    widthUnit?: string;
    heightUnit?: string;

    // Padding
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;

    // Margin
    marginTop?: number | string;
    marginRight?: number | string;
    marginBottom?: number | string;
    marginLeft?: number | string;

    // Border
    borderWidth?: number;
    borderStyle?: string;
    borderColor?: ColorValue;
    borderRadius?: number;
    borderTop?: boolean;
    borderRight?: boolean;
    borderBottom?: boolean;
    borderLeft?: boolean;

    // Box Shadow
    boxShadowX?: number;
    boxShadowY?: number;
    boxShadowBlur?: number;
    boxShadowSpread?: number;
    boxShadowColor?: ColorValue;
    boxShadowInset?: boolean;

    // Filters
    opacity?: number;
    blur?: number;
    brightness?: number;
    contrast?: number;
    grayscale?: number;

    // Transform
    rotate?: number;
    scaleX?: number;
    scaleY?: number;
    translateX?: number;
    translateY?: number;
    skewX?: number;
    skewY?: number;

    // Animation
    animationType?: string;
    animationDuration?: number;
    animationDelay?: number;
    animationEasing?: string;
    animationIterationCount?: string;

    // Alignment
    textAlign?: string;
    verticalAlign?: string;

    // Advanced settings
    htmlId?: string;
    cssClasses?: string;
    customCss?: string;
    htmlAttributes?: Array<{ name: string; value: string }>;

    // Conditions
    conditions?: Array<{ type: string; value: string }>;

    // Visibility
    visibleDesktop?: boolean;
    visibleTablet?: boolean;
    visibleMobile?: boolean;
    hideOnOverflow?: boolean;

    // Transitions
    transitionProperty?: string;
    transitionCustomProperty?: string;
    transitionDuration?: number;
    transitionTimingFunction?: string;
    transitionDelay?: number;

    // Position
    position?: string;
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
    zIndex?: string;

    // Scroll Effects
    enableScrollEffects?: boolean;
    scrollEffectType?: string;
    scrollTriggerPosition?: number;
    scrollEffectDuration?: number;
    scrollEffectIntensity?: number;
    scrollEffectOnce?: boolean;

    // Element-specific settings
    src?: string;
    alt?: string;
    variant?: string;
    size?: string | number;
    color?: ColorValue;
    backgroundColor?: ColorValue;
    fontWeight?: string;
    fontSize?: number;
    link?: string;
    thumbnailPosition?: string;
    thumbnailSize?: number;
    thumbnailGap?: number;
    thumbnailsToShow?: number;
    thumbnailsScrollable?: boolean;
    zoomOnHover?: boolean;

    // Icon specific
    iconName?: string;
    strokeWidth?: number;

    // Hover states
    hoverColor?: ColorValue;
    hoverBackgroundColor?: ColorValue;
    hoverBorderColor?: ColorValue;

    [key: string]: any;
  };
  children?: Element[];
}

export interface Column {
  id: string;
  width: number; // Width in percentage (e.g., 50 for 50%)
  elements: Element[];
  rows?: Row[]; // Support for nested rows
  settings?: {
    backgroundColor?: ColorValue;
    padding?: number;
    border?: string;
    borderRadius?: number;
    [key: string]: any;
  };
  nestingLevel?: number; // Track nesting level
}

export interface Row {
  id: string;
  columns: Column[];
  settings?: {
    maxWidth?: string;
    backgroundColor?: ColorValue;
    padding?: number;
    margin?: number;
    gutter?: number; // Space between columns
    verticalAlign?: "top" | "middle" | "bottom";
    [key: string]: any;
  };
  nestingLevel?: number; // Track nesting level
}

export interface Section {
  id: string;
  type: "regular" | "specialty" | "fullwidth";
  rows: Row[];
  settings?: {
    backgroundColor?: ColorValue;
    backgroundImage?: string;
    backgroundOverlay?: ColorValue;
    padding?: number;
    margin?: number;
    [key: string]: any;
  };
  snapshots?: {
    card: string;
    preview: string;
  };
  name?: string;
  description?: string;
  category?: string;
  isSaved?: boolean;
}

export interface Page {
  id: string;
  title: string;
  sections: Section[];
  elements: Element[]; // For backward compatibility
}

// Path to identify nested elements
export interface ElementPath {
  sectionId: string;
  rowPath: {
    rowId: string;
    columnId?: string;
    nestedRowId?: string;
    nestedColumnId?: string;
  };
}

// Template metadata for sections
export interface SectionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  previewImage?: string;
}

// History tracking
export interface HistoryEntry {
  patches: any[];
  inversePatches: any[];
  action: string;
}

// Page snapshots interface
export interface PageSnapshots {
  [pageId: string]: {
    card: string;
    preview: string;
  };
}

// Builder state interfaces
export interface BuilderState {
  pageId: string | null;
  page: Page;
  history: HistoryEntry[];
  future: HistoryEntry[];
  historyIndex: number;
  selectedElementId: string | null;
  selectedSectionId: string | null;
  selectedRowId: string | null;
  selectedColumnId: string | null;
  isSettingsPanelOpen: boolean;
  isAddSectionModalOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  viewMode: "desktop" | "tablet" | "mobile";
  isPreviewMode: boolean;
  isLayersOpen: boolean;
  isSettingsOpen: boolean;
  currentPageId: string | null;
  currentPageTitle: string | null;
  savePage: (() => Promise<any>) | undefined;
  pageSnapshots: PageSnapshots; // Added this property

  initializeBuilder: (pageId?: string) => void;
  setPage: (page: Page) => void;

  // Element actions
  addElement: (element: Element) => void;
  updateElement: (id: string, updatedElement: Element) => void;
  duplicateElement: (id: string) => void;
  deleteElement: (id: string) => void;
  selectElement: (
    id: string | null,
    containerInfo?: { sectionId: string; rowId: string; columnId: string }
  ) => void;
  getSelectedElement: () => Element | null;

  // Section actions
  addSection: (section: Section) => void;
  updateSection: (id: string, updatedSection: Section) => void;
  updateSectionSnapshots: (
    id: string,
    snapshots: { card: string; preview: string }
  ) => void;
  deleteSection: (id: string) => void;
  selectSection: (id: string | null) => void;
  getSelectedSection: () => Section | null;

  // Row actions
  addRow: (sectionId: string, row: Row, parentColumnId?: string) => void;
  updateRow: (
    sectionId: string,
    rowId: string,
    updatedRow: Row,
    parentColumnId?: string
  ) => void;
  deleteRow: (
    sectionId: string,
    rowId: string,
    parentColumnId?: string
  ) => void;
  selectRow: (
    sectionId: string,
    rowId: string | null,
    parentColumnId?: string
  ) => void;
  getSelectedRow: () => { section: Section; row: Row } | null;

  // Column actions
  addColumn: (
    sectionId: string,
    rowId: string,
    column: Column,
    parentColumnId?: string
  ) => void;
  updateColumn: (
    sectionId: string,
    rowId: string,
    columnId: string,
    updatedColumn: Column,
    parentRowId?: string
  ) => void;
  deleteColumn: (
    sectionId: string,
    rowId: string,
    columnId: string,
    parentColumnId?: string
  ) => void;
  selectColumn: (
    sectionId: string,
    rowId: string,
    columnId: string | null,
    parentRowId?: string
  ) => void;
  getSelectedColumn: () => {
    section: Section;
    row: Row;
    column: Column;
  } | null;

  // UI actions
  closeSettingsPanel: () => void;
  openSettingsPanel: () => void;
  toggleAddSectionModal: () => void;
  undoAction: () => void;
  redoAction: () => void;
  setViewMode: (mode: "desktop" | "tablet" | "mobile") => void;
  togglePreviewMode: () => void;
  toggleLayers: () => void;
  toggleSettings: () => void;
  setCurrentPageInfo: (pageInfo: { id: string; title: string }) => void;

  // Drag and Drop actions
  moveSection: (sectionId: string, newIndex: number) => void;
  moveRow: (
    rowId: string,
    sourceSectionId: string,
    sourceParentColumnId: string | undefined,
    targetSectionId: string,
    targetParentColumnId: string | undefined,
    targetIndex: number
  ) => void;
  moveColumn: (
    columnId: string,
    sourceSectionId: string,
    sourceRowId: string,
    sourceParentColumnId: string | undefined,
    targetSectionId: string,
    targetRowId: string,
    targetParentColumnId: string | undefined,
    targetIndex: number
  ) => void;
  moveElement: (
    elementId: string,
    sourceSectionId: string,
    sourceRowId: string,
    sourceColumnId: string,
    targetSectionId: string,
    targetRowId: string,
    targetColumnId: string,
    targetIndex: number
  ) => void;

  // Reordering actions
  reorderElement: (
    elementId: string,
    sectionId: string,
    rowId: string,
    columnId: string,
    direction: "up" | "down"
  ) => void;
  reorderColumn: (
    columnId: string,
    sectionId: string,
    rowId: string,
    parentRowId: string | undefined,
    direction: "up" | "down"
  ) => void;
  reorderRow: (
    rowId: string,
    sectionId: string,
    parentColumnId: string | undefined,
    direction: "up" | "down"
  ) => void;

  // Page snapshot actions
  setPageSnapshots: (
    pageId: string,
    snapshots: { card: string; preview: string }
  ) => void; // Added this method
}

export type BuilderStateCreator = {
  setState: (
    partial:
      | Partial<BuilderState>
      | ((state: BuilderState) => Partial<BuilderState>),
    replace?: boolean
  ) => void;
  getState: () => BuilderState;
  subscribe: (
    listener: (state: BuilderState, prevState: BuilderState) => void
  ) => () => void;
};

// Saved Sections Store types
export interface SavedSectionsState {
  savedSections: Section[];
  addSection: (section: Section) => void;
  removeSection: (sectionId: string) => void;
  getSavedSections: () => Section[];
  clearSavedSections: () => void;
}

export type ElementType =
  | "heading"
  | "text"
  | "button"
  | "image"
  | "divider"
  | "spacer"
  | "card"
  | "pricing"
  | "testimonial"
  | "stats"
  | "cta"
  | "gallery"
  | "icon"
  | "columns"
  | "container"
  | "animatedImageGrid"
  | "link"
  | "list"
  | "quote"
  | "notification"
  | "feature"
  | "trendingMarkets";

// Add the missing pageAttributes interface
export interface pageAttributes {
  id: string;
  title: string;
  slug: string;
  content: string;
  isHome?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}
