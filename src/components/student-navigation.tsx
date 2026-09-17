import { AppSidebar } from "@/components/app-sidebar";

export function StudentNavigation({ active }: { active: "home" | "request" | "appointments" | "profile" }) {
  return <AppSidebar role="estudiante" active={active} />;
}
