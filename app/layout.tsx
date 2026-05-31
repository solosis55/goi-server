import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goi Server",
  description: "API REST de Goi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
