import { StudentOverview } from "@/components/student-overview";
import { StudentShell } from "@/components/student-shell";

export default function StudentHomePage() {
  return <StudentShell active="home"><StudentOverview /></StudentShell>;
}
