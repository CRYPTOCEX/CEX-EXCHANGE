// cell-renderer-props.ts
export interface CellRendererProps<V = any> {
  /**
   * The raw value for this cell, e.g. a string, number, boolean, etc.
   */
  value: V;

  /**
   * Optionally, the entire row object if you need context.
   */
  row?: Record<string, any>;
}
