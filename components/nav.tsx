"use client";

import { Menu01Icon, Moon02Icon, Sun03Icon } from "@hugeicons-pro/core-bulk-rounded";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, easeOut, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";

/*
 * The same file the tab icon is generated from, imported rather than pointed at
 * by URL: a static import carries the intrinsic size and a content hash, so the
 * mark cannot go stale against the favicon or shift the row while it loads.
 */
import logo from "@/app/icon.png";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  {
    href: "https://github.com/hiaaryan/sileo",
    label: "GitHub",
    external: true,
  },
  { href: "/docs", label: "Docs", external: false },
  { href: "/play", label: "Playground", external: false },
] as const;

interface NavProps {
  className?: string;
  dark?: boolean;
  onToggleDark?: () => void;
}

export function Nav({ className, dark, onToggleDark }: NavProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <nav className={`flex items-center justify-between py-6 ${className ?? ""}`}>
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-70 transition-opacity">
          {/* Asked for at twice the size it is drawn, then pinned back to
					    20px by `size-5`: the mark is 20 CSS px on a 2x screen, so it
					    needs 40 real ones or it renders soft. */}
          <Image src={logo} alt="" width={40} height={40} priority className="size-5 rounded-md" />
          <span className="text-sm font-semibold tracking-tight">sileo</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-2.5 px-3 rounded-full text-xs leading-none font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2.5 px-3 rounded-full text-xs leading-none font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ),
          )}
          {onToggleDark && (
            <button
              type="button"
              onClick={onToggleDark}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-95"
            >
              {dark ? (
                <HugeiconsIcon icon={Sun03Icon} size={14} />
              ) : (
                <HugeiconsIcon icon={Moon02Icon} size={14} />
              )}
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="sm:hidden h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <HugeiconsIcon icon={Menu01Icon} size={16} />
        </button>
      </nav>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-50 bg-black/5 backdrop-blur sm:hidden"
              onClick={close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: easeOut }}
            />

            {/* Panel */}
            <motion.div
              className="fixed top-2 right-2 bottom-2 z-50 w-64 bg-background border border-border rounded-2xl p-2 flex flex-col justify-between sm:hidden"
              initial={{ opacity: 0, x: "50%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "50%" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((link) =>
                  link.external ? (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={close}
                      className="h-8 px-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center"
                    >
                      {link.label}
                    </Link>
                  ),
                )}
              </div>

              {onToggleDark && (
                <button
                  type="button"
                  onClick={onToggleDark}
                  className="h-8 px-2 gap-2 cursor-pointer rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center"
                >
                  {dark ? (
                    <>
                      <HugeiconsIcon icon={Sun03Icon} size={14} /> Light mode
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={Moon02Icon} size={14} /> Dark mode
                    </>
                  )}
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
