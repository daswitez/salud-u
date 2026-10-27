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
  experimental: { proxyClientMaxBodySize: "16mb" },
  async rewrites() {
    if (!backendOrigin) return [];

    // Estas rutas aún no tienen Route Handlers de Next. Las rutas de negocio
    // se migran una a una para no desviar tráfico serverless prematuramente.
    return {
      beforeFiles: [
        { source: "/api/notifications", destination: `${backendOrigin}/api/notifications` },
        { source: "/api/notifications/:notificationId/read", destination: `${backendOrigin}/api/notifications/:notificationId/read` },
        { source: "/api/me/notification-preferences", destination: `${backendOrigin}/api/me/notification-preferences` },
        { source: "/api/audit-events", destination: `${backendOrigin}/api/audit-events` },
        { source: "/api/vaccines", destination: `${backendOrigin}/api/vaccines` },
        { source: "/api/vaccines/:vaccineId", destination: `${backendOrigin}/api/vaccines/:vaccineId` },
        { source: "/api/vaccinations", destination: `${backendOrigin}/api/vaccinations` },
        { source: "/api/vaccinations/context", destination: `${backendOrigin}/api/vaccinations/context` },
        { source: "/api/vaccination-card", destination: `${backendOrigin}/api/vaccination-card` },
        { source: "/api/reports/vaccination-coverage", destination: `${backendOrigin}/api/reports/vaccination-coverage` },
        { source: "/api/research/exports", destination: `${backendOrigin}/api/research/exports` },
        { source: "/api/research/exports/:exportId", destination: `${backendOrigin}/api/research/exports/:exportId` },
        { source: "/api/my-specialties", destination: `${backendOrigin}/api/my-specialties` },
        { source: "/api/reports/compliance", destination: `${backendOrigin}/api/reports/compliance` },
        { source: "/api/reports/daily-activity", destination: `${backendOrigin}/api/reports/daily-activity` },
        { source: "/api/reports/administrative-summary", destination: `${backendOrigin}/api/reports/administrative-summary` },
        { source: "/api/reports/clinical/export", destination: `${backendOrigin}/api/reports/clinical/export` },
        { source: "/api/reports/clinical/exports/:exportId", destination: `${backendOrigin}/api/reports/clinical/exports/:exportId` },
        { source: "/api/reports/clinical", destination: `${backendOrigin}/api/reports/clinical` },
        { source: "/api/health", destination: `${backendOrigin}/api/health` },
        { source: "/api/me", destination: `${backendOrigin}/api/me` },
        { source: "/api/v1/:path*", destination: `${backendOrigin}/api/v1/:path*` },
        { source: "/api/careers", destination: `${backendOrigin}/api/careers` },
        { source: "/api/specialties", destination: `${backendOrigin}/api/specialties` },
        { source: "/api/patients", destination: `${backendOrigin}/api/patients` },
        { source: "/api/patients/:patientId", destination: `${backendOrigin}/api/patients/:patientId` },
        { source: "/api/patients/:patientId/referrals", destination: `${backendOrigin}/api/patients/:patientId/referrals` },
        { source: "/api/administrative/referrals", destination: `${backendOrigin}/api/administrative/referrals` },
        { source: "/api/availability-slots", destination: `${backendOrigin}/api/availability-slots` },
        { source: "/api/appointment-requests", destination: `${backendOrigin}/api/appointment-requests` },
        { source: "/api/appointment-requests/:requestId", destination: `${backendOrigin}/api/appointment-requests/:requestId` },
        { source: "/api/appointment-requests/:requestId/assign", destination: `${backendOrigin}/api/appointment-requests/:requestId/assign` },
        { source: "/api/appointments/:appointmentId/check-in", destination: `${backendOrigin}/api/appointments/:appointmentId/check-in` },
        { source: "/api/appointments/:appointmentId/no-show", destination: `${backendOrigin}/api/appointments/:appointmentId/no-show` },
        { source: "/api/medical/appointments", destination: `${backendOrigin}/api/medical/appointments` },
        { source: "/api/medical/appointments/:appointmentId", destination: `${backendOrigin}/api/medical/appointments/:appointmentId` },
        { source: "/api/medical/appointments/:appointmentId/start", destination: `${backendOrigin}/api/medical/appointments/:appointmentId/start` },
        { source: "/api/medical/patients/:patientId/clinical-background", destination: `${backendOrigin}/api/medical/patients/:patientId/clinical-background` },
        { source: "/api/medical/patients/:patientId/search", destination: `${backendOrigin}/api/medical/patients/:patientId/search` },
        { source: "/api/medical/patients/:patientId", destination: `${backendOrigin}/api/medical/patients/:patientId` },
        { source: "/api/medical/encounters/:encounterId/export.docx", destination: `${backendOrigin}/api/medical/encounters/:encounterId/export.docx` },
        { source: "/api/medical/encounters/:encounterId/amendments", destination: `${backendOrigin}/api/medical/encounters/:encounterId/amendments` },
        { source: "/api/medical/encounters/:encounterId", destination: `${backendOrigin}/api/medical/encounters/:encounterId` },
        { source: "/api/medical/encounters/:encounterId/source-context", destination: `${backendOrigin}/api/medical/encounters/:encounterId/source-context` },
        { source: "/api/medical/encounters/:encounterId/finalize", destination: `${backendOrigin}/api/medical/encounters/:encounterId/finalize` },
        { source: "/api/medical/documents", destination: `${backendOrigin}/api/medical/documents` },
        { source: "/api/medical/documents/:documentId/download", destination: `${backendOrigin}/api/medical/documents/:documentId/download` },
        { source: "/api/medical/documents/:documentId/content", destination: `${backendOrigin}/api/medical/documents/:documentId/content` },
        { source: "/api/medical/referrals", destination: `${backendOrigin}/api/medical/referrals` },
        { source: "/api/medical/assigned-referrals", destination: `${backendOrigin}/api/medical/assigned-referrals` },
        { source: "/api/medical/assigned-referrals/:referralId", destination: `${backendOrigin}/api/medical/assigned-referrals/:referralId` },
        { source: "/api/medical/referrals/:referralId", destination: `${backendOrigin}/api/medical/referrals/:referralId` },
      ],
    };
  },
};

export default nextConfig;
