"use client";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { useSessionName } from "@/components/session-name";

export function StudentShell({ children, active = "" }: { children: React.ReactNode; active?: string }) {
  return <div className="min-h-screen bg-background md:flex"><AppSidebar role="estudiante" active={active} /><main className="min-w-0 flex-1 pb-22 md:pb-0"><AppHeader role="estudiante" name={useSessionName()} />{children}</main></div>;
}
