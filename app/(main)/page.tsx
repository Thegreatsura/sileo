"use client";

import { ArrowRight01Icon } from "@hugeicons-pro/core-bulk-rounded";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { sileo, Toaster } from "sileo";

import { showBooking } from "@/lib/toast-demos";
import { useDark } from "./theme";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function Home() {
  const [copied, setCopied] = useState(false);
  const dark = useDark();

  /*
   * The stage holds one card, open, for as long as the page is. Dismissing it
   * on cleanup rather than firing and forgetting, or React's double-invoked
   * effects would stack two identical toasts in development.
   */
  useEffect(() => {
    showBooking();
    /*
     * `clear` rather than `dismiss`, which only marks the toast exiting and
     * drops it a full exit later. The store outlives this page, and the layout
     * mounts its own window-level Toaster the moment the route is no longer
     * `/` — so for that half second the card was being handed to it and drawn
     * floating in the corner of the next page. Clearing empties the store in
     * the same tick, before anything else can pick the card up.
     */
    return () => sileo.clear();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText("npm install sileo");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Hero */}
      <main className="flex-1 flex flex-col lg:flex-row lg:items-center gap-10 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16, ease }}
          className="w-full lg:w-[38%] lg:shrink-0 flex flex-col items-start gap-5"
        >
          <div className="flex flex-col">
            <h1 className="text-4xl lg:text-7xl font-semibold tracking-tighter">
              sileo<span className="text-neutral-300">.</span>
            </h1>

            <p className="text-sm text-neutral-400 leading-relaxed">
              An opinionated toast component for React.
            </p>
          </div>

          {/* Install */}
          <button
            type="button"
            onClick={handleCopy}
            className="h-10 pl-4 pr-3 rounded-xl text-sm font-medium bg-accent active:scale-[0.98] transition-all flex items-center gap-3 cursor-pointer group"
          >
            <span className="font-mono text-muted-foreground select-none">$</span>
            <span className="font-mono text-[13px] text-foreground">npm install sileo</span>
            <span className="size-6 rounded-lg bg-accent text-muted-foreground flex items-center justify-center group-hover:bg-accent-hover transition-colors">
              {copied ? (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <title>Copied</title>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <title>Copy</title>
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              )}
            </span>
          </button>

          {/* Links */}
          <div className="flex items-center gap-5">
            <Link
              href="/play"
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              Playground
              <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
            </Link>
            <Link
              href="/docs"
              className="text-xs font-medium text-foreground hover:text-foreground-hover transition-colors"
            >
              Documentation
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="hero-browser relative w-full lg:flex-1 lg:min-w-0 min-h-64 lg:min-h-90 rounded-tl-2xl border-l border-t border-border mask-r-from-90% mask-b-from-90%"
        >
          <div aria-hidden="true" className="absolute left-5 top-5 flex items-center gap-2">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="mt-2 lg:mt-0 scale-85 lg:scale-100 origin-left">
            <Toaster
              position="top-left"
              offset={{ top: 36, left: 8 }}
              theme={dark ? "dark" : "light"}
            />
          </div>
        </motion.div>
      </main>
    </>
  );
}
