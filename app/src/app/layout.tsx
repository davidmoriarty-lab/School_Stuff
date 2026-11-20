import type { Metadata } from "next";
import { Sidebar, MobileNav } from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = { title: "Test Scoring Tracker" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="min-w-0 flex-1">
            <MobileNav />
            <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
