// WYSIWYG Editor Types

export type EditorVariant = 'default' | 'borderless' | 'minimal';
export type EditorRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Editor imperative methods exposed via ref
export interface WysiwygEditorRef {
  insertContent: (content: string) => void;
  focus: () => void;
}

// Email preview configuration for wrapping content in email template
export interface EmailPreviewConfig {
  // Enable email preview mode with wrapper
  enabled: boolean;
  // The wrapper HTML template - should contain %MESSAGE% placeholder for content
  wrapperHtml?: string;
  // Sample data to replace variables like %FIRSTNAME%, %EMAIL%, etc.
  sampleData?: Record<string, string>;
  // Subject line for preview (replaces %SUBJECT% and %HEADER%)
  subject?: string;
}

export interface WysiwygEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  uploadDir?: string;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
  readOnly?: boolean;
  showWordCount?: boolean;
  onImageUpload?: (file: File) => Promise<string>;
  // User restriction - when true, media manager only shows user's own files
  userOnly?: boolean;
  // Styling props
  variant?: EditorVariant;
  radius?: EditorRadius;
  bordered?: boolean;
  shadow?: boolean;
  toolbarClassName?: string;
  contentClassName?: string;
  // Email preview with wrapper support
  emailPreview?: EmailPreviewConfig;
}

export interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  heading: string | null;
  alignment: 'left' | 'center' | 'right' | 'justify';
  list: 'bullet' | 'ordered' | null;
  link: string | null;
  blockquote: boolean;
}

export interface SlashCommand {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  action: () => void;
  keywords: string[];
}

export interface EditorHistoryState {
  content: string;
  selection: { start: number; end: number } | null;
}

export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'codeBlock'
  | 'divider'
  | 'table'
  | 'image';
