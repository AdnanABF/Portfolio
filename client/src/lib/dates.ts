/** True for a calendar day written as YYYY-MM-DD (the value of an `<input type="date">`). */
export function isIsoDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

/** Start of the picked day in the browser's time zone, as an ISO instant (inclusive lower bound). */
export function dayStartIso(day: string): string | undefined {
  return isIsoDay(day) ? new Date(`${day}T00:00:00`).toISOString() : undefined;
}

/** Start of the day after the picked day, so the picked end day is fully included (exclusive upper bound). */
export function nextDayStartIso(day: string): string | undefined {
  if (!isIsoDay(day)) return undefined;
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

/** A whole number of 1 or more, or the fallback for anything else (missing, zero, negative, fractional, text). */
export function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}
