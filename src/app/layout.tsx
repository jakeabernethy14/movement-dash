import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "The Movement Coaching", template: "%s | The Movement Coaching" },
  icons: { icon: "/favicon.svg" },
  description: "Your people. Your programme. Your progress. Personal coaching, brought together.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="text-neutral-100 font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
