"use client";

import {
  AirplaneSeatIcon,
  ArrowUp01Icon,
  File01Icon,
  RocketIcon,
} from "@hugeicons-pro/core-bulk-rounded";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import Image from "next/image";
import { type ReactNode, useEffect, useRef } from "react";
import type { SileoPosition } from "sileo";
import { sileo } from "sileo";
import { AREA_D, drawnAt, dropAt, markerAt, WAVE, WAVE_D, xAt } from "./wave";

/* ----------------------------- Toast types -------------------------------- */

export type ToastType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "action"
  | "description"
  | "promise"
  | "promise-success"
  | "promise-error"
  | "custom-icon"
  | "custom-flighty";

export interface ToastButton {
  label: string;
  type: ToastType;
}

/* ----------------------------- Button sets -------------------------------- */

export const HOMEPAGE_BUTTONS: ToastButton[] = [
  { label: "Success", type: "success" },
  { label: "Error", type: "error" },
  { label: "Warning", type: "warning" },
  { label: "Info", type: "info" },
  { label: "Action", type: "action" },
  { label: "Promise", type: "promise" },
  { label: "Icon", type: "custom-icon" },
];

export const PLAYGROUND_BUTTONS: ToastButton[] = [
  { label: "Success", type: "success" },
  { label: "Error", type: "error" },
  { label: "Warning", type: "warning" },
  { label: "Info", type: "info" },
  { label: "Action", type: "action" },
  { label: "Icon", type: "custom-icon" },
  { label: "Promise", type: "promise" },
];

/* -------------------------- Shared toast JSX ------------------------------ */

/** how far along the leg the aircraft gets */
const ARRIVED = 0.35;

/** where the marker sits before the leg has been drawn */
const PARKED = markerAt(0);

/**
 * The leg, drawn in.
 *
 * One number carries the whole thing: the fill's edge is a clip width, the
 * solid half of the stroke is a share of `pathLength`, and the marker is a
 * point, so three different units read the same value and cannot disagree
 * about where the aircraft is.
 *
 * The marker is written straight to its node rather than through React. A
 * toast is already animating its own height and opacity while this plays, and
 * the one thing this must not do is ask for a commit sixty times a second
 * underneath that.
 */
function FlightChart(): ReactNode {
  const reduce = useReducedMotion();
  const marker = useRef<SVGGElement>(null);
  const drop = useRef<SVGLineElement>(null);

  /** how much of the leg is behind the aircraft */
  const along = useMotionValue(0);
  const edge = useTransform(along, xAt);
  const trail = useTransform(along, (s) => 1 - drawnAt(s));

  useMotionValueEvent(along, "change", (s) => {
    marker.current?.setAttribute("transform", markerAt(s));
    drop.current?.setAttribute("y2", dropAt(s).toFixed(2));
  });

  /*
   * It runs once the card is open, which is the only time it is mounted: the
   * description is not in the DOM while the toast is a pill, so there is no
   * chance of the leg being flown behind a closed card and arriving already
   * finished.
   */
  useEffect(() => {
    if (reduce) {
      along.set(ARRIVED);
      return;
    }
    const run = animate(along, ARRIVED, { duration: 1.1, ease: "easeOut" });
    return () => run.stop();
  }, [reduce, along]);

  return (
    <div className="min-w-0 flex-1">
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${WAVE.w} ${WAVE.h}`}
        fill="none"
        className="block w-full overflow-visible mask-x-from-80% [--ink:#22c55e]"
      >
        {/* the leg flown, clipped at its own edge rather than rebuilt as a
				    path every frame */}
        <clipPath id="sileo-leg">
          <motion.rect x={0} y={0} height={WAVE.h} style={{ width: edge }} />
        </clipPath>
        {/* The stops name a variable rather than `currentColor`: a stop
				    resolves `currentColor` against the gradient element itself, not
				    against whatever references it, so a class on the path paints
				    nothing. */}
        <linearGradient id="sileo-leg-ink" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--ink)" stopOpacity={0.3} />
          <stop offset="100%" stopColor="var(--ink)" stopOpacity={0.03} />
        </linearGradient>
        <path d={AREA_D} clipPath="url(#sileo-leg)" fill="url(#sileo-leg-ink)" />

        {/* the plan, and then the part of it that is behind. Two strokes on
				    one path, so the past cannot take a different line from the leg it
				    is tracing. */}
        <path
          d={WAVE_D}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="3.5 6.5"
          stroke="#22c55e"
          strokeOpacity={0.5}
        />
        <motion.path
          d={WAVE_D}
          pathLength={1}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="1 1"
          style={{ strokeDashoffset: trail }}
          stroke="#22c55e"
        />

        <g ref={marker} transform={PARKED}>
          <line
            ref={drop}
            x1={0}
            x2={0}
            y1={0}
            y2={0}
            strokeWidth={1}
            stroke="#22c55e"
            strokeOpacity={0.35}
          />
          <circle r={5.4} className="fill-[#1a1a1a] dark:fill-[#f2f2f2]" />
          <circle r={3.2} fill="#22c55e" />
        </g>
      </svg>
    </div>
  );
}

function FlightToast(): ReactNode {
  return (
    <div className="flex flex-col gap-3.5 -mt-1.5">
      <div className="flex items-center justify-between">
        <Image
          width={70}
          height={28}
          className="h-7.5 -ml-1.5 w-auto invert-0 dark:invert"
          src="/united.png"
          decoding="async"
          alt="United Airlines"
        />
        <span className="text-sm opacity-75 font-medium tracking-tight leading-none">UA13A</span>
      </div>

      <div className="-mt-8 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-medium text-white dark:text-black tracking-tight leading-none">
          DEL
        </span>
        {/* The leg, as the chart: the part flown solid under its own fill,
				    the part still to come dashed, and the marker where one becomes
				    the other. Two strokes on one path, so the past cannot take a
				    different line from the plan it is tracing. */}
        <FlightChart />
        <span className="text-2xl font-medium text-white dark:text-black tracking-tight leading-none">
          SFO
        </span>
      </div>

      <div className="mt-1 hidden lg:flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-sm font-semibold text-green-500 tracking-tight leading-none">
            On Time
          </p>
          <p className="text-sm font-medium tracking-tight leading-none">
            <span className="opacity-50">PNR</span>{" "}
            <span className="text-white dark:text-black">EC2QW4</span>
          </p>
        </div>

        {/* the one warm note on the card, so the seat reads as the thing you
				    were given rather than another status */}
        <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-400 p-2 text-black">
          <HugeiconsIcon icon={AirplaneSeatIcon} size={16} />
          <span className="text-sm font-semibold tracking-tight leading-none">32K</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Standing demo ------------------------------- */

/**
 * The booking card, held open.
 *
 * The landing's stage is a still rather than a reel, so this one is pinned:
 * `duration: null` is what the dismiss loop skips, and `collapse: 0` is read as
 * a delay of zero rather than a request — the component only arms a collapse
 * timer when the delay is above zero, so none is ever set.
 *
 * **The expand delay is deliberately left alone.** Every toast is created under
 * the one id `sileo-default`, so anything else fired while this is up does not
 * stack beside it — it replaces this card and morphs it into the new content.
 * The card's own button is inert for that reason — see it below.
 */
export function showBooking(position?: SileoPosition) {
  return sileo.success({
    title: "Booking Confirmed",
    description: <FlightToast />,
    /*
     * Present, and deliberately inert. Every toast is created under the one
     * id `sileo-default`, so anything this fired would not appear beside the
     * card — it would replace it, morph it into the new content, and then
     * dismiss on its own clock, leaving the stage empty. The button is part
     * of the picture rather than a control being offered.
     */
    button: { title: "View Details", onClick: () => {} },
    position,
    duration: null,
    autopilot: { collapse: 0 },
  });
}

/* ----------------------------- Fire toast --------------------------------- */

export function fireToast(type: ToastType, position?: SileoPosition) {
  switch (type) {
    case "success":
      sileo.success({
        title: "Changes Saved",
        description:
          "Changes saved successfully to the database. Please refresh the page to see the changes.",
        position,
      });
      break;
    case "error":
      sileo.error({
        title: "Something Went Wrong",
        description:
          "We're having trouble saving your changes to the server. Please try again in a few minutes.",
        position,
      });
      break;
    case "warning":
      sileo.warning({
        title: "Storage Almost Full",
        description:
          "You've used 95% of your available storage. Please upgrade your plan to continue.",
        position,
      });
      break;
    case "info":
      sileo.action({
        icon: <HugeiconsIcon icon={ArrowUp01Icon} size={14} />,
        title: "New Update Available",
        description:
          "Version 2.0 is now available. Please update your app to continue using the latest features.",
        position,
      });
      break;
    case "action":
      sileo.action({
        title: "File Uploaded",
        icon: <HugeiconsIcon icon={File01Icon} size={14} />,
        description: "Your file has been uploaded. Share it with your team?",
        button: {
          title: "Share Now",
          onClick: () => sileo.success({ title: "Link Copied", position }),
        },
        position,
      });
      break;
    case "promise":
      sileo.promise(new Promise((resolve) => setTimeout(resolve, 2500)), {
        loading: { title: "Booking Flight" },
        success: {
          title: "Booking Confirmed",
          button: {
            title: "View Details",
            onClick: () => sileo.success({ title: "Details Viewed", position }),
          },
          description: <FlightToast />,
        },
        error: { title: "Booking Failed" },
        position,
      });
      break;
    case "custom-icon":
      sileo.success({
        title: "Deployment Started",
        icon: <HugeiconsIcon icon={RocketIcon} size={14} />,
        description: "Your app is being deployed to production.",
        position,
      });
      break;
  }
}
