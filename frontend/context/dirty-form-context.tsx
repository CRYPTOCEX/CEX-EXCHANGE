"use client";

// dirty-form-context.tsx
import { createContext, useContext, useState, ReactNode } from "react";

interface DirtyFormContextType {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
}

const DirtyFormContext = createContext<DirtyFormContextType>({
  isDirty: false,
  setDirty: () => {},
});

export function DirtyFormProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [isDirty, setDirty] = useState(false);
  return (
    <DirtyFormContext.Provider value={{ isDirty, setDirty }}>
      {children}
    </DirtyFormContext.Provider>
  );
}

export function useDirtyForm() {
  return useContext(DirtyFormContext);
}
