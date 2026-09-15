import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salud Universitaria",
  description: "Gestión de atención médica universitaria",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
