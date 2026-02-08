"use client";

import {
	type CSSProperties,
	type MouseEventHandler,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Sileo,
	type SileoButton,
	type SileoState,
	type SileoStyles,
} from "./sileo";

/* -------------------------------- Constants ------------------------------- */

const DEFAULT_DURATION = 6000;
const EXIT_DURATION = DEFAULT_DURATION * 0.1;
const AUTO_EXPAND_DELAY = DEFAULT_DURATION * 0.025;
const AUTO_COLLAPSE_DELAY = DEFAULT_DURATION - 2000;

const TOAST_POSITIONS = [
	"top-left",
	"top-center",
	"top-right",
	"bottom-left",
	"bottom-center",
	"bottom-right",
] as const;

export type ToastPosition = (typeof TOAST_POSITIONS)[number];
export type ToastButton = SileoButton;
export type ToastStyles = SileoStyles;

/* ---------------------------------- Types --------------------------------- */

export interface ToastOptions {
	title?: string;
	description?: ReactNode | string;
	position?: ToastPosition;
	duration?: number | null;
	icon?: ReactNode | null;
	styles?: ToastStyles;
	fill?: string;
	autopilot?: boolean | { expand?: number; collapse?: number };
	button?: ToastButton;
}

interface InternalToastOptions extends ToastOptions {
	id?: string;
	state?: SileoState;
}

interface ToastItem extends InternalToastOptions {
	id: string;
	instanceId: string;
	exiting?: boolean;
	autoExpandDelayMs?: number;
	autoCollapseDelayMs?: number;
}

type ToasterOffsetValue = number | string;
type ToasterOffsetConfig = Partial<
	Record<"top" | "right" | "bottom" | "left", ToasterOffsetValue>
>;

export interface ToasterProps {
	children?: ReactNode;
	position?: ToastPosition;
	offset?: ToasterOffsetValue | ToasterOffsetConfig;
	options?: Partial<ToastOptions>;
}

/* ------------------------------ Global State ------------------------------ */

type ToastListener = (toasts: ToastItem[]) => void;

const store = {
	toasts: [] as ToastItem[],
	listeners: new Set<ToastListener>(),
	position: "top-right" as ToastPosition,
	options: undefined as Partial<ToastOptions> | undefined,
	emit() {
		for (const fn of this.listeners) fn(this.toasts);
	},
	update(fn: (prev: ToastItem[]) => ToastItem[]) {
		this.toasts = fn(this.toasts);
		this.emit();
	},
};

let idCounter = 0;
const generateId = () =>
	`${++idCounter}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const timeoutKey = (t: ToastItem) => `${t.id}:${t.instanceId}`;

/* ------------------------------- Toast API -------------------------------- */

const dismissToast = (id: string) => {
	const item = store.toasts.find((t) => t.id === id);
	if (!item || item.exiting) return;
	store.update((prev) =>
		prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
	);
	setTimeout(
		() => store.update((prev) => prev.filter((t) => t.id !== id)),
		EXIT_DURATION,
	);
};

const resolveAutopilot = (
	opts: InternalToastOptions,
	duration: number | null,
): { expandDelayMs?: number; collapseDelayMs?: number } => {
	if (opts.autopilot === false || !duration || duration <= 0) return {};
	const cfg = typeof opts.autopilot === "object" ? opts.autopilot : undefined;
	const clamp = (v: number) => Math.min(duration, Math.max(0, v));
	return {
		expandDelayMs: clamp(cfg?.expand ?? AUTO_EXPAND_DELAY),
		collapseDelayMs: clamp(cfg?.collapse ?? AUTO_COLLAPSE_DELAY),
	};
};

const createToast = (options: InternalToastOptions) => {
	const live = store.toasts.filter((t) => !t.exiting);
	const merged = {
		...store.options,
		...options,
		styles: { ...store.options?.styles, ...options.styles },
	};

	const prev = merged.id
		? live.find((t) => t.id === merged.id)
		: live[live.length - 1];
	const id = merged.id ?? prev?.id ?? generateId();
	const instanceId = generateId();
	const duration = merged.duration ?? DEFAULT_DURATION;
	const auto = resolveAutopilot(merged, duration);

	const item: ToastItem = {
		...merged,
		id,
		instanceId,
		position: merged.position ?? prev?.position ?? store.position,
		autoExpandDelayMs: auto.expandDelayMs,
		autoCollapseDelayMs: auto.collapseDelayMs,
	};

	store.update(() => [item]);
	return { id, duration };
};

const updateToast = (id: string, options: InternalToastOptions) => {
	const existing = store.toasts.find((t) => t.id === id);
	if (!existing) return;

	const merged = {
		...store.options,
		...options,
		styles: { ...store.options?.styles, ...options.styles },
	};

	const instanceId = generateId();
	const duration = merged.duration ?? DEFAULT_DURATION;
	const auto = resolveAutopilot(merged, duration);

	const item: ToastItem = {
		...merged,
		id,
		instanceId,
		position: merged.position ?? existing.position ?? store.position,
		autoExpandDelayMs: auto.expandDelayMs,
		autoCollapseDelayMs: auto.collapseDelayMs,
	};

	store.update((prev) => prev.map((t) => (t.id === id ? item : t)));
};

export interface ToastPromiseOptions<T = unknown> {
	loading: Pick<ToastOptions, "title" | "icon">;
	success: ToastOptions | ((data: T) => ToastOptions);
	error: ToastOptions | ((err: unknown) => ToastOptions);
	action?: ToastOptions | ((data: T) => ToastOptions);
}

export const sileo = {
	show: (opts: ToastOptions) => createToast(opts).id,
	success: (opts: ToastOptions) =>
		createToast({ ...opts, state: "success" }).id,
	error: (opts: ToastOptions) => createToast({ ...opts, state: "error" }).id,
	warning: (opts: ToastOptions) =>
		createToast({ ...opts, state: "warning" }).id,
	info: (opts: ToastOptions) => createToast({ ...opts, state: "info" }).id,
	action: (opts: ToastOptions) => createToast({ ...opts, state: "action" }).id,
	promise: <T,>(
		promise: Promise<T> | (() => Promise<T>),
		opts: ToastPromiseOptions<T>,
	): Promise<T> => {
		const { id } = createToast({
			...opts.loading,
			state: "loading",
			duration: null,
		});

		const p = typeof promise === "function" ? promise() : promise;

		p.then((data) => {
			if (opts.action) {
				const actionOpts =
					typeof opts.action === "function" ? opts.action(data) : opts.action;
				updateToast(id, { ...actionOpts, state: "action", id });
			} else {
				const successOpts =
					typeof opts.success === "function"
						? opts.success(data)
						: opts.success;
				updateToast(id, { ...successOpts, state: "success", id });
			}
		}).catch((err) => {
			const errorOpts =
				typeof opts.error === "function" ? opts.error(err) : opts.error;
			updateToast(id, { ...errorOpts, state: "error", id });
		});

		return p;
	},
	dismiss: dismissToast,
	clear: (position?: ToastPosition) =>
		store.update((prev) =>
			position ? prev.filter((t) => t.position !== position) : [],
		),
};

/* ------------------------------ Toaster Component ------------------------- */

export function Toaster({
	children,
	position = "top-right",
	offset,
	options,
}: ToasterProps) {
	const [toasts, setToasts] = useState<ToastItem[]>(store.toasts);
	const [activeId, setActiveId] = useState<string>();

	const hoverRef = useRef(false);
	const timersRef = useRef(new Map<string, number>());
	const listRef = useRef(toasts);
	const latestRef = useRef<string | undefined>(undefined);

	const clearAllTimers = useCallback(() => {
		for (const t of timersRef.current.values()) clearTimeout(t);
		timersRef.current.clear();
	}, []);

	useEffect(() => {
		store.position = position;
		store.options = options;
	}, [position, options]);

	useEffect(() => {
		const listener: ToastListener = (next) => setToasts(next);
		store.listeners.add(listener);
		return () => {
			store.listeners.delete(listener);
			clearAllTimers();
		};
	}, [clearAllTimers]);

	const schedule = useCallback((items: ToastItem[]) => {
		if (hoverRef.current) return;
		for (const item of items) {
			if (item.exiting) continue;
			const key = timeoutKey(item);
			if (timersRef.current.has(key)) continue;
			const dur = item.duration ?? DEFAULT_DURATION;
			if (dur === null || dur <= 0) continue;
			timersRef.current.set(
				key,
				window.setTimeout(() => dismissToast(item.id), dur),
			);
		}
	}, []);

	useEffect(() => {
		listRef.current = toasts;
		// Clean up timers for removed toasts
		for (const [key, timer] of timersRef.current) {
			if (!toasts.some((t) => timeoutKey(t) === key)) {
				clearTimeout(timer);
				timersRef.current.delete(key);
			}
		}
		schedule(toasts);
	}, [toasts, schedule]);

	const handleMouseEnter: MouseEventHandler<HTMLButtonElement> =
		useCallback(() => {
			if (hoverRef.current) return;
			hoverRef.current = true;
			clearAllTimers();
		}, [clearAllTimers]);

	const handleMouseLeave: MouseEventHandler<HTMLButtonElement> =
		useCallback(() => {
			if (!hoverRef.current) return;
			hoverRef.current = false;
			schedule(listRef.current);
		}, [schedule]);

	const latest = useMemo(() => {
		for (let i = toasts.length - 1; i >= 0; i--)
			if (!toasts[i].exiting) return toasts[i].id;
		return undefined;
	}, [toasts]);

	useEffect(() => {
		latestRef.current = latest;
		setActiveId(latest);
	}, [latest]);

	const getViewportStyle = useCallback(
		(pos: ToastPosition): CSSProperties | undefined => {
			if (offset === undefined) return undefined;
			const o =
				typeof offset === "object"
					? offset
					: { top: offset, right: offset, bottom: offset, left: offset };
			const s: CSSProperties = {};
			const px = (v: ToasterOffsetValue) =>
				typeof v === "number" ? `${v}px` : v;
			if (pos.startsWith("top") && o.top) s.top = px(o.top);
			if (pos.startsWith("bottom") && o.bottom) s.bottom = px(o.bottom);
			if (pos.endsWith("left") && o.left) s.left = px(o.left);
			if (pos.endsWith("right") && o.right) s.right = px(o.right);
			return s;
		},
		[offset],
	);

	const byPosition = useMemo(() => {
		const map = {} as Partial<Record<ToastPosition, ToastItem[]>>;
		for (const t of toasts) {
			const pos = t.position ?? position;
			if (!map[pos]) map[pos] = [];
			map[pos].push(t);
		}
		return map;
	}, [toasts, position]);

	const handlersCache = useRef(
		new Map<
			string,
			{
				enter: MouseEventHandler<HTMLButtonElement>;
				leave: MouseEventHandler<HTMLButtonElement>;
			}
		>(),
	);

	// Keep handler deps fresh via refs so cached closures never go stale
	const handleMouseEnterRef = useRef(handleMouseEnter);
	handleMouseEnterRef.current = handleMouseEnter;
	const handleMouseLeaveRef = useRef(handleMouseLeave);
	handleMouseLeaveRef.current = handleMouseLeave;

	const getHandlers = useCallback((toastId: string) => {
		let cached = handlersCache.current.get(toastId);
		if (cached) return cached;
		cached = {
			enter: ((e) => {
				setActiveId((prev) => (prev === toastId ? prev : toastId));
				handleMouseEnterRef.current(e);
			}) as MouseEventHandler<HTMLButtonElement>,
			leave: ((e) => {
				setActiveId((prev) =>
					prev === latestRef.current ? prev : latestRef.current,
				);
				handleMouseLeaveRef.current(e);
			}) as MouseEventHandler<HTMLButtonElement>,
		};
		handlersCache.current.set(toastId, cached);
		return cached;
	}, []);

	return (
		<>
			{children}
			{TOAST_POSITIONS.map((pos) => {
				const items = byPosition[pos];
				if (!items?.length) return null;
				const pill = pos.includes("right")
					? "right"
					: pos.includes("center")
						? "center"
						: "left";
				const expand = pos.startsWith("top") ? "bottom" : "top";
				return (
					<section
						key={pos}
						data-sileo-viewport
						data-position={pos}
						aria-live="polite"
						style={getViewportStyle(pos)}
					>
						{items.map((item) => {
							const h = getHandlers(item.id);
							return (
								<Sileo
									key={item.id}
									id={item.id}
									state={item.state}
									title={item.title}
									description={item.description}
									position={pill}
									expand={expand}
									icon={item.icon}
									fill={item.fill}
									styles={item.styles}
									button={item.button}
									exiting={item.exiting}
									autoExpandDelayMs={item.autoExpandDelayMs}
									autoCollapseDelayMs={item.autoCollapseDelayMs}
									refreshKey={item.instanceId}
									canExpand={activeId === undefined || activeId === item.id}
									onMouseEnter={h.enter}
									onMouseLeave={h.leave}
								/>
							);
						})}
					</section>
				);
			})}
		</>
	);
}
