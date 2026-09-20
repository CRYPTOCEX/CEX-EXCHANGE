// Identity verification types
interface IdentityType {
  value: string;
  label: string;
  fields: IdentityDocumentField[];
}

interface IdentityDocumentField {
  id: string;
  label: string;
  description?: string;
  required: boolean;
  type: "FILE";
  accept?: string;
}
