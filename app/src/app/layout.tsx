import type { CSSProperties } from "react";
import { Sidebar, MobileNav } from "@/components/Sidebar";
import { getSettings } from "@/lib/store";
import { dailyBackup } from "@/lib/backup";
import { accentVars, FONT_PX } from "@/lib/settings";
import "./globals.css";

// Read the teacher's settings on every request, so a change shows up right away.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: getSettings().appName };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  dailyBackup();
  const s = getSettings();
  const style = { ...accentVars(s.accent), fontSize: FONT_PX[s.fontScale] } as CSSProperties;
  const pad = s.density === "compact" ? "px-4 py-4 md:px-6" : "px-5 py-8 md:px-10";
  return (
    <html lang="en" className={s.theme === "dark" ? "dark-mode" : ""} style={style}>
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar appName={s.appName} modules={s.modules} />
          <div className="min-w-0 flex-1">
            <MobileNav modules={s.modules} />
            <main className={`mx-auto w-full max-w-6xl ${pad}`}>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
