// Types for home page section editors

export interface EditorProps {
  variables: Record<string, any>;
  getValue: (path: string) => any;
  updateVariable: (path: string, value: any) => void;
}

export interface Step {
  step: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
}
