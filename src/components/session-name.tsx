"use client";
import { createContext, useContext } from "react";

/** Nombre del actor resuelto por el layout con la sesión Spring; las pantallas cliente no lo inventan. */
const SessionNameContext = createContext("");
export function SessionNameProvider({ name, children }: { name: string; children: React.ReactNode }) {
  return <SessionNameContext.Provider value={name}>{children}</SessionNameContext.Provider>;
}
export function useSessionName() { return useContext(SessionNameContext); }
