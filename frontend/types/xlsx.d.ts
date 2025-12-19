declare module 'xlsx' {
  export function read(data: any, opts?: any): any;
  export const utils: {
    sheet_to_json(worksheet: any, opts?: any): any[];
  };
}