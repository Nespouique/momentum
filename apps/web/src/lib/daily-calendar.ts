export interface DailyDateContext {
  date: string;
  dayStart: string;
  nextDayStart: string;
  weekStart: string;
  monthStart: string;
  weekDateStart: string;
  monthDateStart: string;
}

export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

export function addCalendarDays(dateKey: string, amount: number): string {
  const date = parseLocalDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return getLocalDateKey(date);
}

export function getDailyDateContext(dateKey: string): DailyDateContext {
  const day = parseLocalDateKey(dateKey);
  if (getLocalDateKey(day) !== dateKey) throw new RangeError("Invalid calendar date");
  const dayStart = new Date(day);
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);
  const week = new Date(day);
  const daysSinceMonday = (week.getDay() + 6) % 7;
  week.setDate(week.getDate() - daysSinceMonday);
  const month = new Date(day.getFullYear(), day.getMonth(), 1);
  const nextCalendarDay = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);

  return {
    date: dateKey,
    dayStart: dayStart.toISOString(),
    nextDayStart: nextCalendarDay.toISOString(),
    weekStart: week.toISOString(),
    monthStart: month.toISOString(),
    weekDateStart: getLocalDateKey(week),
    monthDateStart: getLocalDateKey(month),
  };
}

export function formatLocalDate(dateKey: string): string {
  return parseLocalDateKey(dateKey)
    .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    .replace(/^\w/, (character) => character.toUpperCase());
}
