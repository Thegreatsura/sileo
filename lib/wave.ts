export const WAVE = { w: 300, h: 76 } as const;

/** the ground the water is measured against, and the foot of the fill */
export const FLOOR = 75;

const SWING = 48;

/** the cycle, as a height above the floor: 0 at low water, 1 at high */
const riseAt = (p: number) => (1 - Math.cos(2 * Math.PI * p)) / 2;

const yAt = (p: number) => FLOOR - SWING * riseAt(p);

/** where a fraction of the cycle sits across the drawing */
export const xAt = (s: number) => Math.min(Math.max(s, 0), 1) * WAVE.w;

/** enough that the chords and the cosine differ by well under a pixel */
const SAMPLES = 160;

interface Step {
  x: number;
  y: number;
  /** distance along the curve at this sample */
  at: number;
}

const curve: Step[] = (() => {
  const steps: Step[] = [];
  let run = 0;
  let last = { x: xAt(0), y: yAt(0) };
  steps.push({ ...last, at: 0 });

  for (let i = 1; i <= SAMPLES; i++) {
    const p = i / SAMPLES;
    const next = { x: xAt(p), y: yAt(p) };
    run += Math.hypot(next.x - last.x, next.y - last.y);
    steps.push({ ...next, at: run });
    last = next;
  }
  return steps;
})();

const SPAN = curve[curve.length - 1].at;

/** the cycle itself */
export const WAVE_D = curve
  .map((s, i) => `${i === 0 ? "M" : "L"} ${s.x.toFixed(2)} ${s.y.toFixed(2)}`)
  .join(" ");

/** the same curve closed against the floor, so it can be filled */
export const AREA_D = `${WAVE_D} L ${WAVE.w} ${FLOOR} L 0 ${FLOOR} Z`;

/** the point a fraction `s` of the way through the cycle */
const seatAt = (s: number) => {
  const p = Math.min(Math.max(s, 0), 1);
  const i = p * SAMPLES;
  const lo = Math.min(Math.floor(i), SAMPLES - 1);
  const k = i - lo;
  const a = curve[lo];
  const b = curve[lo + 1];
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    at: a.at + (b.at - a.at) * k,
  };
};

/** how much of the stroke is behind the marker, as a share of `pathLength` */
export const drawnAt = (s: number) => seatAt(s).at / SPAN;

/** the marker's seat, as a transform rather than a pair of attributes */
export const markerAt = (s: number) => {
  const { x, y } = seatAt(s);
  return `translate(${x.toFixed(2)} ${y.toFixed(2)})`;
};

/** the drop from the marker to the floor, in the marker's own frame */
export const dropAt = (s: number) => FLOOR - seatAt(s).y;
