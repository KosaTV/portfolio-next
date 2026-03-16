"use client";

import { createContext, useContext, useState, useCallback } from "react";

type LoadingState = "loading" | "exiting" | "logo-flying" | "done";

interface LoadingContextType {
  state: LoadingState;
  setState: (s: LoadingState) => void;
}

const LoadingContext = createContext<LoadingContextType>({
  state: "loading",
  setState: () => {},
});

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<LoadingState>("loading");
  const setState = useCallback((s: LoadingState) => setStateRaw(s), []);

  return (
    <LoadingContext.Provider value={{ state, setState }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}
