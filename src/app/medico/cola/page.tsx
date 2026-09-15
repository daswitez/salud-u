import { redirect } from "next/navigation";

/** La cola se integró a la agenda para evitar dos vistas operativas paralelas. */
export default function DoctorQueueRedirect() {
  redirect("/medico/agenda");
}
