"use client";

import { createContext, useContext } from "react";

type ShellActions = {
  openAI: () => void;
  openAdd: () => void;
  profileName: string;
  profileInitials: string;
};

const ShellContext = createContext<ShellActions | null>(null);

export function ShellProvider({
  value,
  children,
}: {
  value: ShellActions;
  children: React.ReactNode;
}) {
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellActions {
  const value = useContext(ShellContext);
  if (!value) {
    throw new Error("useShell must be used within ShellProvider");
  }
  return value;
}
