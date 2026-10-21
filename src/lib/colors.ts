export const STOPS: [number, [number, number, number]][] = [
  [0, [181, 212, 244]],
  [8, [133, 183, 235]],
  [12, [93, 202, 165]],
  [16, [151, 196, 89]],
  [20, [239, 208, 39]],
  [24, [239, 159, 39]],
  [28, [226, 75, 74]],
  [34, [163, 45, 45]],
  [40, [127, 119, 221]]
];

export function windRgb(kn: number): [number, number, number] {
  const v = Math.max(0, Math.min(40, kn));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [a, ca] = STOPS[i];
    const [b, cb] = STOPS[i + 1];
    if (v <= b) {
      const t = (v - a) / (b - a);
      return [0, 1, 2].map((j) => Math.round(ca[j] + (cb[j] - ca[j]) * t)) as [number, number, number];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

export function windColor(kn: number): string {
  const [r, g, b] = windRgb(kn);
  return `rgb(${r}, ${g}, ${b})`;
}

export function windTextColor(kn: number): string {
  return kn >= 27 ? '#ffffff' : '#14181f';
}

export function legendGradient(): string {
  return `linear-gradient(90deg, ${STOPS.map(([k, c]) => `rgb(${c.join(', ')}) ${(k / 40) * 100}%`).join(', ')})`;
}
