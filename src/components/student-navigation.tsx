import { AppSidebar } from "@/components/app-sidebar";

export function StudentNavigation({ active }: { active: "home" | "search" }) {
  return <AppSidebar role="estudiante" active={active} />;
}
