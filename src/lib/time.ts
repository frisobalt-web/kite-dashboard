const TZ = 'Europe/Amsterdam';
const hourFmt = new Intl.DateTimeFormat('nl-NL', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' });
const hmFmt = new Intl.DateTimeFormat('nl-NL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dayFmt = new Intl.DateTimeFormat('nl-NL', { timeZone: TZ, weekday: 'short', day: 'numeric' });
const longFmt = new Intl.DateTimeFormat('nl-NL', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

export const hourLabel = (ms: number) => hourFmt.format(ms);
export const hm = (ms: number) => hmFmt.format(ms);
export const dayLabel = (ms: number) => {
  const s = dayFmt.format(ms).replace('.', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const longDay = (ms: number) => longFmt.format(ms).replace(/\./g, '');
/** Datum (YYYY-MM-DD) in Nederlandse tijd. */
export const dayKey = (ms: number) => keyFmt.format(ms);
