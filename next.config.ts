import type { NextConfig } from "next";

const backendOrigin = process.env.SALUD_U_BACKEND_ORIGIN?.replace(/\/$/, "");

if (backendOrigin) {
  try {
    new URL(backendOrigin);
  } catch {
    throw new Error("SALUD_U_BACKEND_ORIGIN debe ser una URL absoluta válida.");
  }
}

const nextConfig: NextConfig = {
  async rewrites() {
    if (!backendOrigin) return [];

    // Estas rutas aún no tienen Route Handlers de Next. Las rutas de negocio
    // se migran una a una para no desviar tráfico serverless prematuramente.
    return {
      beforeFiles: [
        { source: "/api/health", destination: `${backendOrigin}/api/health` },
        { source: "/api/me", destination: `${backendOrigin}/api/me` },
        { source: "/api/v1/:path*", destination: `${backendOrigin}/api/v1/:path*` },
        { source: "/api/careers", destination: `${backendOrigin}/api/careers` },
        { source: "/api/specialties", destination: `${backendOrigin}/api/specialties` },
        { source: "/api/patients", destination: `${backendOrigin}/api/patients` },
        { source: "/api/patients/:patientId", destination: `${backendOrigin}/api/patients/:patientId` },
        { source: "/api/availability-slots", destination: `${backendOrigin}/api/availability-slots` },
        { source: "/api/appointment-requests", destination: `${backendOrigin}/api/appointment-requests` },
        { source: "/api/appointment-requests/:requestId", destination: `${backendOrigin}/api/appointment-requests/:requestId` },
        { source: "/api/appointment-requests/:requestId/assign", destination: `${backendOrigin}/api/appointment-requests/:requestId/assign` },
        { source: "/api/appointments/:appointmentId/check-in", destination: `${backendOrigin}/api/appointments/:appointmentId/check-in` },
        { source: "/api/appointments/:appointmentId/no-show", destination: `${backendOrigin}/api/appointments/:appointmentId/no-show` },
        { source: "/api/medical/appointments", destination: `${backendOrigin}/api/medical/appointments` },
        { source: "/api/medical/appointments/:appointmentId/start", destination: `${backendOrigin}/api/medical/appointments/:appointmentId/start` },
        { source: "/api/medical/patients/:patientId/clinical-background", destination: `${backendOrigin}/api/medical/patients/:patientId/clinical-background` },
        { source: "/api/medical/encounters/:encounterId", destination: `${backendOrigin}/api/medical/encounters/:encounterId` },
        { source: "/api/medical/encounters/:encounterId/finalize", destination: `${backendOrigin}/api/medical/encounters/:encounterId/finalize` },
      ],
    };
  },
};

export default nextConfig;
