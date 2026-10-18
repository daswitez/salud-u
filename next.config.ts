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
      ],
    };
  },
};

export default nextConfig;
