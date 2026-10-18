import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // FE-01: Spring posee y verifica la sesión. Las pantallas SSR resuelven la
  // identidad mediante /api/me; no se refresca ninguna sesión de Supabase.
  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
