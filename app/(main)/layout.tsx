"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { Toaster } from "sileo";

import { Nav } from "@/components/nav";
import { ThemeContext } from "./theme";

export default function MainLayout({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  /*
   * The home page mounts the `Toaster` inside its own stage so the toasts play
   * in the box rather than at the window's corner. Two of them would both
   * subscribe to the one global store and render every toast twice, so the
   * layout stands down on that route instead of competing.
   */
  const staged = usePathname() === "/";

  useEffect(() => {
    const saved = localStorage.getItem("sileo-docs-theme");
    if (saved === "dark") setDark(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sileo-docs-theme", dark ? "dark" : "light");
    document.documentElement.classList.add("no-transitions");
    document.documentElement.classList.toggle("dark", dark);
    requestAnimationFrame(() => {
      document.documentElement.classList.remove("no-transitions");
    });
  }, [dark]);

  return (
    <ThemeContext.Provider value={dark}>
      <div className="min-h-dvh w-full flex flex-col bg-background text-foreground">
        {!staged && <Toaster position="top-center" offset={8} theme={dark ? "dark" : "light"} />}

        <div className="max-w-4xl w-full mx-auto px-6 flex-1 flex flex-col">
          <Nav dark={dark} onToggleDark={() => setDark((d) => !d)} />

          <div className="flex-1 flex flex-col">{children}</div>

          <footer className="py-6 flex items-center justify-between border-t border-border">
            <span className="text-xs text-muted-foreground">sileo — MIT License</span>
            <Link
              href="/play"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Playground →
            </Link>
          </footer>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
