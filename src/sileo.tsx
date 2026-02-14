import {
	ArrowRightIcon,
	CheckIcon,
	CircleAlertIcon,
	LifeBuoyIcon,
	LoaderCircleIcon,
	XIcon,
} from "lucide-react";
import {
	type CSSProperties,
	type MouseEventHandler,
	memo,
	type ReactNode,
	type TransitionEventHandler,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import "./sileo.css";

/* --------------------------------- Config --------------------------------- */

const HEIGHT = 40;
const WIDTH = 350;
const DEFAULT_ROUNDNESS = 18;
const BLUR_RATIO = 0.5;
const PILL_PADDING = 10;
const MIN_EXPAND_RATIO = 2.25;
const SWAP_COLLAPSE_MS = 200;
const HEADER_EXIT_MS = 150;

import type { SileoButton, SileoState, SileoStyles } from "./types";

type State = SileoState;

interface View {
	title?: string;
	description?: ReactNode | string;
	state: State;
	icon?: ReactNode | null;
	styles?: SileoStyles;
	button?: SileoButton;
	fill: string;
}

interface SileoProps {
	id: string;
	fill?: string;
	state?: State;
	title?: string;
	description?: ReactNode | string;
	position?: "left" | "center" | "right";
	expand?: "top" | "bottom";
	className?: string;
	icon?: ReactNode | null;
	styles?: SileoStyles;
	button?: SileoButton;
	roundness?: number;
	exiting?: boolean;
	autoExpandDelayMs?: number;
	autoCollapseDelayMs?: number;
	canExpand?: boolean;
	interruptKey?: string;
	refreshKey?: string;
	onMouseEnter?: MouseEventHandler<HTMLButtonElement>;
	onMouseLeave?: MouseEventHandler<HTMLButtonElement>;
}

/* ---------------------------------- Icons --------------------------------- */

const STATE_ICON: Record<State, ReactNode> = {
	success: <CheckIcon size={16} />,
	loading: (
		<LoaderCircleIcon size={16} data-sileo-icon="spin" aria-hidden="true" />
	),
	error: <XIcon size={16} />,
	warning: <CircleAlertIcon size={16} />,
	info: <LifeBuoyIcon size={16} />,
	action: <ArrowRightIcon size={16} />,
};

/* ----------------------------- Sub-components ----------------------------- */

const HeaderInner = memo(function HeaderInner({
	innerRef,
	layer,
	isExiting,
}: {
	innerRef?: React.RefObject<HTMLDivElement | null>;
	layer: { key: string; view: View };
	isExiting?: boolean;
}) {
	const { view } = layer;
	return (
		<div
			ref={innerRef}
			key={layer.key}
			data-sileo-header-inner
			data-layer={isExiting ? "prev" : "current"}
			data-exiting={isExiting || undefined}
		>
			<div
				data-sileo-badge
				data-state={view.state}
				className={view.styles?.badge}
			>
				{view.icon ?? STATE_ICON[view.state]}
			</div>
			<span
				data-sileo-title
				data-state={view.state}
				className={view.styles?.title}
			>
				{view.title}
			</span>
		</div>
	);
});

/* ----------------------------- Memoised Defs ------------------------------ */
/* The gooey filter <defs> never changes after mount — memoising it prevents
   React from diffing the filter node tree on every toast state update.
   `color-interpolation-filters="sRGB"` avoids the default linearRGB
   conversion which doubles the work (gamma encode → blur → decode). */
const GooeyDefs = memo(function GooeyDefs({
	filterId,
	blur,
}: {
	filterId: string;
	blur: number;
}) {
	return (
		<defs>
			<filter
				id={filterId}
				x="-20%"
				y="-20%"
				width="140%"
				height="140%"
				colorInterpolationFilters="sRGB"
			>
				<feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
				<feColorMatrix
					in="blur"
					mode="matrix"
					values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
					result="goo"
				/>
				<feComposite in="SourceGraphic" in2="goo" operator="atop" />
			</filter>
		</defs>
	);
});

/* ------------------------------- Component -------------------------------- */

export const Sileo = memo(function Sileo({
	id,
	fill = "#FFFFFF",
	state = "success",
	title = state,
	description,
	position = "left",
	expand = "bottom",
	className,
	icon,
	styles,
	button,
	roundness,
	exiting = false,
	autoExpandDelayMs,
	autoCollapseDelayMs,
	canExpand,
	interruptKey,
	refreshKey,
	onMouseEnter,
	onMouseLeave,
}: SileoProps) {
	const next: View = useMemo(
		() => ({ title, description, state, icon, styles, button, fill }),
		[title, description, state, icon, styles, button, fill],
	);

	const [view, setView] = useState<View>(next);
	const [_, setApplied] = useState(refreshKey);
	const [isExpanded, setIsExpanded] = useState(false);
	const [ready, setReady] = useState(false);
	const [pillWidth, setPillWidth] = useState(0);
	const [contentHeight, setContentHeight] = useState(0);
	const hasDesc = Boolean(view.description) || Boolean(view.button);
	const isLoading = view.state === "loading";
	const open = hasDesc && isExpanded && !isLoading;
	const allowExpand = isLoading
		? false
		: (canExpand ?? (!interruptKey || interruptKey === id));

	// Key for AnimatePresence crossfade — changes when title or state changes
	const headerKey = `${view.state}-${view.title}`;

	// Unique filter ID per toast instance to prevent SVG filter collisions
	const filterId = `sileo-gooey-${id}`;
	const resolvedRoundness = Math.max(0, roundness ?? DEFAULT_ROUNDNESS);
	const blur = resolvedRoundness * BLUR_RATIO;

	const headerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const headerExitRef = useRef<number | null>(null);
	const autoExpandRef = useRef<number | null>(null);
	const autoCollapseRef = useRef<number | null>(null);
	const swapTimerRef = useRef<number | null>(null);
	const lastRefreshKeyRef = useRef(refreshKey);
	const pendingRef = useRef<{ key?: string; payload: View } | null>(null);
	const [headerLayer, setHeaderLayer] = useState<{
		current: { key: string; view: View };
		prev: { key: string; view: View } | null;
	}>({ current: { key: headerKey, view }, prev: null });

	/* ------------------------------ Measurements ------------------------------ */

	const innerRef = useRef<HTMLDivElement>(null);

	const headerPadRef = useRef<number | null>(null);

	useLayoutEffect(() => {
		const el = innerRef.current;
		const header = headerRef.current;
		if (!el || !header) return;
		// Read padding once — it's set by CSS and doesn't change.
		if (headerPadRef.current === null) {
			const cs = getComputedStyle(header);
			headerPadRef.current =
				parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
		}
		const px = headerPadRef.current;
		const measure = () => {
			const w = el.scrollWidth + px + PILL_PADDING;
			if (w > PILL_PADDING) {
				setPillWidth((prev) => (prev === w ? prev : w));
			}
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	useLayoutEffect(() => {
		if (!hasDesc) {
			setContentHeight(0);
			return;
		}
		const el = contentRef.current;
		if (!el) return;
		const measure = () => {
			const h = el.scrollHeight;
			setContentHeight((prev) => (prev === h ? prev : h));
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, [hasDesc]);

	useEffect(() => {
		const raf = requestAnimationFrame(() => setReady(true));
		return () => cancelAnimationFrame(raf);
	}, []);

	useLayoutEffect(() => {
		setHeaderLayer((state) => {
			if (state.current.key === headerKey) {
				if (state.current.view === view) return state;
				return { ...state, current: { key: headerKey, view } };
			}
			return {
				prev: state.current,
				current: { key: headerKey, view },
			};
		});
	}, [headerKey, view]);

	useEffect(() => {
		if (!headerLayer.prev) return;
		if (headerExitRef.current) {
			clearTimeout(headerExitRef.current);
		}
		headerExitRef.current = window.setTimeout(() => {
			headerExitRef.current = null;
			setHeaderLayer((state) => ({ ...state, prev: null }));
		}, HEADER_EXIT_MS);
		return () => {
			if (headerExitRef.current) {
				clearTimeout(headerExitRef.current);
				headerExitRef.current = null;
			}
		};
	}, [headerLayer.prev]);

	/* ----------------------------- Refresh logic ------------------------------ */

	useEffect(() => {
		if (refreshKey === undefined) {
			setView(next);
			setApplied(undefined);
			pendingRef.current = null;
			lastRefreshKeyRef.current = refreshKey;
			return;
		}

		if (lastRefreshKeyRef.current === refreshKey) return;
		lastRefreshKeyRef.current = refreshKey;

		if (swapTimerRef.current) {
			clearTimeout(swapTimerRef.current);
			swapTimerRef.current = null;
		}

		if (open) {
			pendingRef.current = { key: refreshKey, payload: next };
			setIsExpanded(false);
			// Don't wait for full collapse transition — swap content after a short delay
			swapTimerRef.current = window.setTimeout(() => {
				swapTimerRef.current = null;
				const pending = pendingRef.current;
				if (!pending) return;
				setView(pending.payload);
				setApplied(pending.key);
				pendingRef.current = null;
			}, SWAP_COLLAPSE_MS);
		} else {
			pendingRef.current = null;
			setView(next);
			setApplied(refreshKey);
		}
	}, [open, refreshKey, next]);

	/* ----------------------------- Auto expand/collapse ----------------------- */

	useEffect(() => {
		if (!hasDesc) return;

		if (autoExpandRef.current) clearTimeout(autoExpandRef.current);
		if (autoCollapseRef.current) clearTimeout(autoCollapseRef.current);

		if (exiting || !allowExpand) {
			setIsExpanded(false);
			return;
		}

		if (autoExpandDelayMs == null && autoCollapseDelayMs == null) return;

		const expandDelay = autoExpandDelayMs ?? 0;
		const collapseDelay = autoCollapseDelayMs ?? 0;

		if (expandDelay > 0) {
			autoExpandRef.current = window.setTimeout(
				() => setIsExpanded(true),
				expandDelay,
			);
		} else {
			setIsExpanded(true);
		}

		if (collapseDelay > 0) {
			autoCollapseRef.current = window.setTimeout(
				() => setIsExpanded(false),
				collapseDelay,
			);
		}

		return () => {
			if (autoExpandRef.current) clearTimeout(autoExpandRef.current);
			if (autoCollapseRef.current) clearTimeout(autoCollapseRef.current);
		};
	}, [autoCollapseDelayMs, autoExpandDelayMs, hasDesc, allowExpand, exiting]);

	/* ------------------------------ Derived values ---------------------------- */

	const minExpanded = HEIGHT * MIN_EXPAND_RATIO;
	// Use minExpanded for all toasts to ensure consistent scaling/roundness
	const rawExpanded = hasDesc
		? Math.max(minExpanded, HEIGHT + contentHeight)
		: minExpanded;

	// Freeze the expanded height while collapsed so a mid-transition content
	// swap doesn't cause the pill height to jump and produce a double-spring.
	// Only update when expanded (open) or when there's no description.
	const frozenExpandedRef = useRef(rawExpanded);
	if (open) {
		frozenExpandedRef.current = rawExpanded;
	}

	const expanded = open ? rawExpanded : frozenExpandedRef.current;
	const svgHeight = hasDesc ? Math.max(expanded, minExpanded) : HEIGHT;
	const expandedContent = Math.max(0, expanded - HEIGHT);
	const resolvedPillWidth = Math.max(pillWidth || HEIGHT, HEIGHT);

	const pillX =
		position === "right"
			? WIDTH - resolvedPillWidth
			: position === "center"
				? (WIDTH - resolvedPillWidth) / 2
				: 0;

	/* ------------------------------- Inline styles ---------------------------- */

	const css = useMemo(() => {
		const yShift = open ? (expand === "bottom" ? 3 : -3) : 0;
		return {
			viewport: { height: open ? expanded : HEIGHT } as CSSProperties,
			pill: {
				transform: `scaleY(${open ? 1 : HEIGHT / expanded})`,
				width: resolvedPillWidth,
				height: open ? expanded - 5 : expanded,
			} as CSSProperties,
			body: {
				transform: `scaleY(${open ? 1 : 0})`,
				opacity: open ? 1 : 0,
			} as CSSProperties,
			header: {
				left: pillX,
				transform: `translateY(${yShift}px) scale(${open ? 0.9 : 1})`,
				"--sileo-pill-width": `${resolvedPillWidth}px`,
			} as CSSProperties,
			content: { opacity: open ? 1 : 0 } as CSSProperties,
		};
	}, [open, expanded, resolvedPillWidth, pillX, expand]);

	/* -------------------------------- Handlers -------------------------------- */

	const handleEnter: MouseEventHandler<HTMLButtonElement> = useCallback(
		(e) => {
			onMouseEnter?.(e);
			if (hasDesc) setIsExpanded(true);
		},
		[hasDesc, onMouseEnter],
	);

	const handleLeave: MouseEventHandler<HTMLButtonElement> = useCallback(
		(e) => {
			onMouseLeave?.(e);
			setIsExpanded(false);
		},
		[onMouseLeave],
	);

	const handleTransitionEnd: TransitionEventHandler<HTMLButtonElement> =
		useCallback(
			(e) => {
				if (e.propertyName !== "height" && e.propertyName !== "transform")
					return;
				if (open) return;
				// Fallback: if the swap timer hasn't fired yet, flush now
				const pending = pendingRef.current;
				if (!pending) return;
				if (swapTimerRef.current) {
					clearTimeout(swapTimerRef.current);
					swapTimerRef.current = null;
				}
				setView(pending.payload);
				setApplied(pending.key);
				pendingRef.current = null;
			},
			[open],
		);

	/* --------------------------------- Render --------------------------------- */

	return (
		<button
			type="button"
			data-sileo-toast
			data-ready={ready}
			data-expanded={open}
			data-exiting={exiting}
			data-edge={expand}
			data-position={position}
			data-state={view.state}
			className={className}
			style={css.viewport}
			onMouseEnter={handleEnter}
			onMouseLeave={handleLeave}
			onTransitionEnd={handleTransitionEnd}
		>
			{/* SVG Gooey */}
			<div data-sileo-canvas data-edge={expand}>
				<svg
					data-sileo-svg
					width={WIDTH}
					height={svgHeight}
					viewBox={`0 0 ${WIDTH} ${svgHeight}`}
				>
					<title>Sileo Notification</title>
					<GooeyDefs filterId={filterId} blur={blur} />
					<g filter={`url(#${filterId})`}>
						<rect
							data-sileo-pill
							x={pillX}
							rx={resolvedRoundness}
							ry={resolvedRoundness}
							fill={view.fill}
							style={css.pill}
						/>
						<rect
							data-sileo-body
							y={HEIGHT}
							width={WIDTH}
							height={expandedContent}
							rx={resolvedRoundness}
							ry={resolvedRoundness}
							fill={view.fill}
							style={css.body}
						/>
					</g>
				</svg>
			</div>

			{/* Header with morphing content */}
			<div
				ref={headerRef}
				data-sileo-header
				data-edge={expand}
				style={css.header}
			>
				<div data-sileo-header-stack>
					<HeaderInner innerRef={innerRef} layer={headerLayer.current} />
					{headerLayer.prev && (
						<HeaderInner layer={headerLayer.prev} isExiting />
					)}
				</div>
			</div>

			{hasDesc && (
				<div
					data-sileo-content
					data-edge={expand}
					data-visible={open}
					style={css.content}
				>
					<div
						ref={contentRef}
						data-sileo-description
						className={view.styles?.description}
					>
						{view.description}
						{view.button && (
							// biome-ignore lint/a11y/useValidAnchor: Button is nested inside outer <button>
							<a
								href="#"
								data-sileo-button
								data-state={view.state}
								className={view.styles?.button}
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									view.button?.onClick();
								}}
							>
								{view.button.title}
							</a>
						)}
					</div>
				</div>
			)}
		</button>
	);
});
