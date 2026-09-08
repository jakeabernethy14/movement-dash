import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Movement Coaching",
  description: "Client & training management dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-base-950 text-neutral-100 font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
